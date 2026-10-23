import db from "../models/index.js";
import logger from "../config/logger.js";
import fs from "fs";
import { LANGUAGE_SEED } from "../data/languages.js";

export const tableExists = async (table) => {
  const [rows] = await db.sequelize.query(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = :table`,
    { replacements: { table } }
  );
  return rows.length > 0;
};

const ensureEmailTemplateOrgNullable = async () => {
  const [rows] = await db.sequelize.query(
    `SELECT IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'emailTemplates'
       AND COLUMN_NAME = 'orgId'`
  );
  if (!rows.length || rows[0].IS_NULLABLE === "YES") return;

  const [fkRows] = await db.sequelize.query(
    `SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'emailTemplates'
       AND COLUMN_NAME = 'orgId'
       AND REFERENCED_TABLE_NAME IS NOT NULL`
  );
  for (const row of fkRows) {
    await db.sequelize.query(
      `ALTER TABLE emailTemplates DROP FOREIGN KEY \`${row.CONSTRAINT_NAME}\``
    );
  }

  await db.sequelize.query("ALTER TABLE emailTemplates MODIFY orgId int(11) NULL");

  if (fkRows.length) {
    await db.sequelize.query(
      `ALTER TABLE emailTemplates
       ADD CONSTRAINT emailtemplates_orgId_fk
       FOREIGN KEY (orgId) REFERENCES organizations(id)
       ON DELETE CASCADE ON UPDATE CASCADE`
    );
  }

  logger.info("emailTemplates.orgId is now nullable (global master templates).");
};

const ensureTripPeopleRoleParticipantCost = async () => {
  const [rows] = await db.sequelize.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'tripPeopleRoles'
       AND COLUMN_NAME = 'participantCost'`
  );
  if (rows.length) return;

  await db.sequelize.query(
    "ALTER TABLE tripPeopleRoles ADD COLUMN participantCost DECIMAL(10, 2) NULL AFTER status"
  );
  logger.info("tripPeopleRoles.participantCost column added.");
};

const ensureOrganizationSubdomain = async () => {
  const [rows] = await db.sequelize.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'organizations'
       AND COLUMN_NAME = 'subdomain'`
  );
  if (!rows.length) {
    await db.sequelize.query(
      "ALTER TABLE organizations ADD COLUMN subdomain VARCHAR(63) NULL AFTER colorFamily"
    );
    logger.info("organizations.subdomain column added.");
  }

  const [indexes] = await db.sequelize.query("SHOW INDEX FROM `organizations`");
  const names = new Set(indexes.map((i) => i.Key_name));
  if (!names.has("organizations_subdomain_unique")) {
    await db.sequelize.query(
      "ALTER TABLE organizations ADD UNIQUE INDEX organizations_subdomain_unique (subdomain)"
    );
    logger.info("organizations.subdomain unique index added.");
  }
};

const ensureOrganizationWebsiteUrl = async () => {
  const [rows] = await db.sequelize.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'organizations'
       AND COLUMN_NAME = 'websiteUrl'`
  );
  if (rows.length) return;

  await db.sequelize.query(
    "ALTER TABLE organizations ADD COLUMN websiteUrl VARCHAR(500) NULL AFTER email"
  );
  logger.info("organizations.websiteUrl column added.");
};

const ensureOrganizationAgreementFileName = async () => {
  fs.mkdirSync("agreements", { recursive: true });

  const [rows] = await db.sequelize.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'organizations'
       AND COLUMN_NAME = 'agreementFileName'`
  );
  if (rows.length) return;

  await db.sequelize.query(
    "ALTER TABLE organizations ADD COLUMN agreementFileName VARCHAR(500) NULL AFTER logo"
  );
  logger.info("organizations.agreementFileName column added.");
};

const ensureOrganizationMedicalAgreementFileName = async () => {
  fs.mkdirSync("agreements", { recursive: true });

  const [rows] = await db.sequelize.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'organizations'
       AND COLUMN_NAME = 'medicalAgreementFileName'`
  );
  if (rows.length) return;

  await db.sequelize.query(
    "ALTER TABLE organizations ADD COLUMN medicalAgreementFileName VARCHAR(500) NULL AFTER agreementFileName"
  );
  logger.info("organizations.medicalAgreementFileName column added.");
};

const ensureOrganizationTestMode = async () => {
  const [rows] = await db.sequelize.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'organizations'
       AND COLUMN_NAME = 'testMode'`
  );
  if (rows.length) return;

  await db.sequelize.query(
    "ALTER TABLE organizations ADD COLUMN testMode TINYINT(1) NOT NULL DEFAULT 0 AFTER subdomain"
  );
  logger.info("organizations.testMode column added.");
};

const ensureDonorPersonId = async () => {
  const [rows] = await db.sequelize.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'donors'
       AND COLUMN_NAME = 'personId'`
  );
  if (rows.length) return;

  await db.sequelize.query("ALTER TABLE donors ADD COLUMN personId INT NULL AFTER status");
  await db.sequelize.query("ALTER TABLE donors ADD UNIQUE INDEX donors_personId_unique (personId)");
  await db.sequelize.query(
    `ALTER TABLE donors
     ADD CONSTRAINT donors_personId_fk
     FOREIGN KEY (personId) REFERENCES people(id)
     ON DELETE SET NULL ON UPDATE CASCADE`
  );
  logger.info("donors.personId column added (unique, ON DELETE SET NULL).");
};

const ensureTripPeopleRoleTripWorkerRoleId = async () => {
  const [rows] = await db.sequelize.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'tripPeopleRoles'
       AND COLUMN_NAME = 'tripWorkerRoleId'`
  );
  if (!rows.length) {
    await db.sequelize.query(
      "ALTER TABLE tripPeopleRoles ADD COLUMN tripWorkerRoleId INT NULL AFTER roleId"
    );
    logger.info("tripPeopleRoles.tripWorkerRoleId column added.");
  }

  const [fkRows] = await db.sequelize.query(
    `SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'tripPeopleRoles'
       AND COLUMN_NAME = 'tripWorkerRoleId'
       AND REFERENCED_TABLE_NAME IS NOT NULL`
  );
  if (!fkRows.length) {
    await db.sequelize.query(
      `ALTER TABLE tripPeopleRoles
       ADD CONSTRAINT trippeopleroles_tripWorkerRoleId_fk
       FOREIGN KEY (tripWorkerRoleId) REFERENCES tripWorkerRoles(id)
       ON DELETE SET NULL ON UPDATE CASCADE`
    );
    logger.info("tripPeopleRoles.tripWorkerRoleId foreign key added (ON DELETE SET NULL).");
  }
};

const ensurePersonProfileFields = async () => {
  const columns = [
    ["middleName", "VARCHAR(255) NULL AFTER firstName"],
    ["preferredName", "VARCHAR(255) NULL AFTER lastName"],
    ["birthDate", "DATE NULL"],
    ["gender", "ENUM('male', 'female') NULL"],
    ["emergencyContactName", "VARCHAR(255) NULL"],
    ["emergencyContactPhoneCountryCode", "VARCHAR(10) NULL"],
    ["emergencyContactPhoneNumber", "VARCHAR(30) NULL"],
    [
      "emergencyContactRelationship",
      "ENUM('spouse','father','mother','child','grandmother','grandfather','other') NULL",
    ],
    ["hasAllergies", "TINYINT(1) NULL"],
    ["allergiesDescription", "TEXT NULL"],
    ["takesMedication", "TINYINT(1) NULL"],
    ["speaksOtherLanguage", "TINYINT(1) NULL"],
    ["currentChurchHome", "VARCHAR(255) NULL"],
    ["currentChurchHomeCity", "VARCHAR(100) NULL"],
    ["currentChurchHomeStateProv", "VARCHAR(100) NULL"],
  ];

  for (const [columnName, definition] of columns) {
    const [rows] = await db.sequelize.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'people'
         AND COLUMN_NAME = :columnName`,
      { replacements: { columnName } }
    );
    if (rows.length) continue;

    await db.sequelize.query(
      `ALTER TABLE people ADD COLUMN \`${columnName}\` ${definition}`
    );
    logger.info(`people.${columnName} column added.`);
  }

  // Allow unset (null) for Yes/No health questions so UI does not default to No.
  for (const columnName of ["hasAllergies", "takesMedication"]) {
    const [rows] = await db.sequelize.query(
      `SELECT IS_NULLABLE, COLUMN_DEFAULT FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'people'
         AND COLUMN_NAME = :columnName`,
      { replacements: { columnName } }
    );
    if (!rows.length) continue;
    if (rows[0].IS_NULLABLE === "YES") continue;
    await db.sequelize.query(
      `ALTER TABLE people MODIFY COLUMN \`${columnName}\` TINYINT(1) NULL`
    );
    logger.info(`people.${columnName} column made nullable.`);

    // One-time: treat prior DB default No as unanswered (only when first opening nullability).
    if (columnName === "hasAllergies") {
      const [result] = await db.sequelize.query(
        `UPDATE people
         SET hasAllergies = NULL
         WHERE hasAllergies = 0
           AND (allergiesDescription IS NULL OR TRIM(allergiesDescription) = '')`
      );
      if (result?.affectedRows) {
        logger.info(`people.hasAllergies default No→unset for ${result.affectedRows} row(s).`);
      }
    } else if (await tableExists("personMedicalConditions")) {
      const [result] = await db.sequelize.query(
        `UPDATE people p
         SET p.takesMedication = NULL
         WHERE p.takesMedication = 0
           AND NOT EXISTS (
             SELECT 1 FROM personMedicalConditions pmc WHERE pmc.personId = p.id
           )`
      );
      if (result?.affectedRows) {
        logger.info(`people.takesMedication default No→unset for ${result.affectedRows} row(s).`);
      }
    }
  }

  for (const columnName of ["passportCountry", "passportIssueDate", "passportExpireDate", "isPregnant", "pregnancyDueDate"]) {
    const [rows] = await db.sequelize.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'people'
         AND COLUMN_NAME = :columnName`,
      { replacements: { columnName } }
    );
    if (!rows.length) continue;
    await db.sequelize.query(`ALTER TABLE people DROP COLUMN \`${columnName}\``);
    logger.info(`people.${columnName} column removed.`);
  }
};

const ensureTripPeopleRoleApplicationFields = async () => {
  const columns = [
    ["willSelfFund", "TINYINT(1) NOT NULL DEFAULT 0"],
    ["willRaiseFunds", "TINYINT(1) NOT NULL DEFAULT 0"],
    ["licenseStatus", "ENUM('yes', 'yes_retired', 'no') NULL"],
    ["hasPreferredRoommate", "TINYINT(1) NOT NULL DEFAULT 0"],
    ["preferredRoommateNames", "VARCHAR(500) NULL"],
    ["agreementAccepted", "TINYINT(1) NOT NULL DEFAULT 0"],
    ["agreementSignatureName", "VARCHAR(255) NULL"],
    ["agreementDate", "DATETIME NULL"],
    ["agreementAdultFirstName", "VARCHAR(100) NULL"],
    ["agreementAdultLastName", "VARCHAR(100) NULL"],
    ["agreementAdultEmail", "VARCHAR(255) NULL"],
    ["agreementAdultRelationship", "VARCHAR(100) NULL"],
    ["medicalAgreementAccepted", "TINYINT(1) NOT NULL DEFAULT 0"],
    ["medicalAgreementDate", "DATETIME NULL"],
    ["isPregnant", "TINYINT(1) NULL"],
    ["pregnancyDueDate", "DATE NULL"],
    ["flightPurchaseOption", "ENUM('self', 'organization') NULL"],
    ["preferredDepartureAirportId", "INT NULL"],
    ["preferredReturnAirportId", "INT NULL"],
    ["preferredCabinClass", "VARCHAR(50) NULL"],
    ["preferredAirlineId", "INT NULL"],
    ["preferredRefundableTicket", "TINYINT(1) NULL"],
  ];

  for (const [columnName, definition] of columns) {
    const [rows] = await db.sequelize.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'tripPeopleRoles'
         AND COLUMN_NAME = :columnName`,
      { replacements: { columnName } }
    );
    if (rows.length) continue;

    await db.sequelize.query(
      `ALTER TABLE tripPeopleRoles ADD COLUMN \`${columnName}\` ${definition}`
    );
    logger.info(`tripPeopleRoles.${columnName} column added.`);
  }

  // Migrate legacy agreementSignedAt → agreementDate, then drop signedAt.
  const [dateCols] = await db.sequelize.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'tripPeopleRoles'
       AND COLUMN_NAME IN ('agreementDate', 'agreementSignedAt')`
  );
  const names = new Set(dateCols.map((r) => r.COLUMN_NAME));
  if (names.has("agreementSignedAt")) {
    if (names.has("agreementDate")) {
      await db.sequelize.query(`
        UPDATE tripPeopleRoles
        SET agreementDate = agreementSignedAt
        WHERE agreementDate IS NULL AND agreementSignedAt IS NOT NULL
      `);
    }
    await db.sequelize.query(`ALTER TABLE tripPeopleRoles DROP COLUMN agreementSignedAt`);
    logger.info("tripPeopleRoles.agreementSignedAt migrated to agreementDate and removed.");
  }
};

const ensureTripPeopleRoleStatus = async () => {
  const [columns] = await db.sequelize.query(
    `SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'tripPeopleRoles'
       AND COLUMN_NAME = 'status'`
  );
  if (!columns.length) return;

  const columnType = columns[0]?.COLUMN_TYPE || "";
  const desired =
    columnType.includes("'incomplete'") &&
    columnType.includes("'applied'") &&
    columnType.includes("'approved'") &&
    columnType.includes("'declined'") &&
    columnType.includes("'cancelled'") &&
    !columnType.includes("'ready'") &&
    !columnType.includes("'denied'") &&
    !columnType.includes("'canceled'") &&
    !columnType.includes("'active'") &&
    !columnType.includes("'inactive'");
  if (desired) return;

  await db.sequelize.query(`
    ALTER TABLE tripPeopleRoles
    MODIFY COLUMN status ENUM(
      'active', 'inactive', 'ready', 'denied', 'canceled',
      'incomplete', 'applied', 'approved', 'declined', 'cancelled'
    ) NOT NULL DEFAULT 'incomplete'
  `);
  await db.sequelize.query(`
    UPDATE tripPeopleRoles SET status = 'approved' WHERE status = 'active'
  `);
  await db.sequelize.query(`
    UPDATE tripPeopleRoles SET status = 'incomplete' WHERE status = 'inactive'
  `);
  await db.sequelize.query(`
    UPDATE tripPeopleRoles SET status = 'applied' WHERE status = 'ready'
  `);
  await db.sequelize.query(`
    UPDATE tripPeopleRoles SET status = 'declined' WHERE status = 'denied'
  `);
  await db.sequelize.query(`
    UPDATE tripPeopleRoles SET status = 'cancelled' WHERE status = 'canceled'
  `);
  await db.sequelize.query(`
    ALTER TABLE tripPeopleRoles
    MODIFY COLUMN status ENUM('incomplete', 'applied', 'approved', 'declined', 'cancelled')
    NOT NULL DEFAULT 'incomplete'
  `);
  logger.info("tripPeopleRoles.status updated to incomplete/applied/approved/declined/cancelled.");
};

/** Trip applicants are Trip Participants whose status tracks where they are in the process. */
const ensureTripApplicantRoleRemoved = async () => {
  const [applicantRows] = await db.sequelize.query(
    `SELECT id FROM roles WHERE roleName = 'Trip Applicant' LIMIT 1`
  );
  if (!applicantRows.length) return;
  const applicantRoleId = applicantRows[0].id;

  const [participantRows] = await db.sequelize.query(
    `SELECT id FROM roles WHERE roleName = 'Trip Participant' LIMIT 1`
  );
  if (!participantRows.length) {
    await db.sequelize.query(
      `INSERT INTO roles (roleName, roleDescription, createdAt, updatedAt)
       VALUES ('Trip Participant', 'Participant on a trip', NOW(), NOW())`
    );
  }
  const [[participantRole]] = await db.sequelize.query(
    `SELECT id FROM roles WHERE roleName = 'Trip Participant' LIMIT 1`
  );

  await db.sequelize.query(
    `UPDATE tripPeopleRoles SET roleId = :participantRoleId, updatedAt = NOW()
     WHERE roleId = :applicantRoleId`,
    { replacements: { participantRoleId: participantRole.id, applicantRoleId } }
  );
  await db.sequelize.query(`DELETE FROM roles WHERE id = :applicantRoleId`, {
    replacements: { applicantRoleId },
  });
  logger.info("Trip Applicant role merged into Trip Participant and removed.");
};

const ensureDocumentTypesTable = async () => {
  const [tables] = await db.sequelize.query(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'documentTypes'`
  );

  if (!tables.length) {
    await db.sequelize.query(`
      CREATE TABLE documentTypes (
        id INT NOT NULL AUTO_INCREMENT,
        description VARCHAR(255) NOT NULL,
        type ENUM('medical_licence', 'passport', 'certification', 'diploma') NOT NULL,
        documentNumberRequired TINYINT(1) NOT NULL DEFAULT 0,
        instructions TEXT NULL,
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL,
        PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    logger.info("documentTypes table created.");
  } else {
    const [columns] = await db.sequelize.query(
      `SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'documentTypes'
         AND COLUMN_NAME = 'type'`
    );
    const columnType = columns[0]?.COLUMN_TYPE || "";
    if (!columnType.includes("medical_licence") || columnType.includes("'medical'")) {
      await db.sequelize.query(`
        ALTER TABLE documentTypes
        MODIFY COLUMN type ENUM('medical', 'licences', 'passport', 'medical_licence', 'certification', 'diploma') NOT NULL
      `);
      await db.sequelize.query(`
        UPDATE documentTypes
        SET type = 'medical_licence'
        WHERE type IN ('medical', 'licences')
      `);
      await db.sequelize.query(`
        ALTER TABLE documentTypes
        MODIFY COLUMN type ENUM('medical_licence', 'passport', 'certification', 'diploma') NOT NULL
      `);
      logger.info(
        "documentTypes.type enum updated to medical_licence, passport, certification, and diploma."
      );
    } else if (!columnType.includes("diploma")) {
      await db.sequelize.query(`
        ALTER TABLE documentTypes
        MODIFY COLUMN type ENUM('medical_licence', 'passport', 'certification', 'diploma') NOT NULL
      `);
      logger.info("documentTypes.type enum added diploma.");
    }
  }

  const [orgIdCols] = await db.sequelize.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'documentTypes'
       AND COLUMN_NAME = 'orgId'`
  );
  if (orgIdCols.length) {
    const [fks] = await db.sequelize.query(
      `SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'documentTypes'
         AND COLUMN_NAME = 'orgId'
         AND REFERENCED_TABLE_NAME IS NOT NULL`
    );
    for (const fk of fks) {
      await db.sequelize.query(
        `ALTER TABLE documentTypes DROP FOREIGN KEY \`${fk.CONSTRAINT_NAME}\``
      );
    }
    await db.sequelize.query(`ALTER TABLE documentTypes DROP COLUMN orgId`);
    logger.info("documentTypes.orgId column removed (now system-wide).");
  }

  const [numberRequiredCols] = await db.sequelize.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'documentTypes'
       AND COLUMN_NAME = 'documentNumberRequired'`
  );
  if (!numberRequiredCols.length) {
    await db.sequelize.query(
      `ALTER TABLE documentTypes
       ADD COLUMN documentNumberRequired TINYINT(1) NOT NULL DEFAULT 0
       AFTER type`
    );
    logger.info("documentTypes.documentNumberRequired column added.");
  }

  const [instructionsCols] = await db.sequelize.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'documentTypes'
       AND COLUMN_NAME = 'instructions'`
  );
  if (!instructionsCols.length) {
    await db.sequelize.query(
      `ALTER TABLE documentTypes
       ADD COLUMN instructions TEXT NULL
       AFTER documentNumberRequired`
    );
    logger.info("documentTypes.instructions column added.");
  }

  const [specializationCols] = await db.sequelize.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'documentTypes'
       AND COLUMN_NAME = 'allowSpecialization'`
  );
  if (!specializationCols.length) {
    await db.sequelize.query(
      `ALTER TABLE documentTypes
       ADD COLUMN allowSpecialization TINYINT(1) NOT NULL DEFAULT 0
       AFTER instructions`
    );
    logger.info("documentTypes.allowSpecialization column added.");
  }

  const [expirationCols] = await db.sequelize.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'documentTypes'
       AND COLUMN_NAME = 'hasExpirationDate'`
  );
  if (!expirationCols.length) {
    await db.sequelize.query(
      `ALTER TABLE documentTypes
       ADD COLUMN hasExpirationDate TINYINT(1) NOT NULL DEFAULT 1
       AFTER allowSpecialization`
    );
    logger.info("documentTypes.hasExpirationDate column added.");
  }

  const seeds = [
    ["Medical Licence", "medical_licence"],
    ["Passport", "passport"],
    ["Certification", "certification"],
    ["Diploma", "diploma"],
  ];
  for (const [description, type] of seeds) {
    const [rows] = await db.sequelize.query(
      `SELECT id FROM documentTypes WHERE type = :type LIMIT 1`,
      { replacements: { type } }
    );
    if (rows.length) continue;
    await db.sequelize.query(
      `INSERT INTO documentTypes (description, type, createdAt, updatedAt)
       VALUES (:description, :type, NOW(), NOW())`,
      { replacements: { description, type } }
    );
    logger.info(`Document type seeded: ${description}.`);
  }
};

const ensurePersonDocumentsTable = async () => {
  fs.mkdirSync("documents/people", { recursive: true });

  const [tables] = await db.sequelize.query(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'personDocuments'`
  );
  if (!tables.length) {
    await db.sequelize.query(`
      CREATE TABLE personDocuments (
        id INT NOT NULL AUTO_INCREMENT,
        personId INT NOT NULL,
        documentTypeId INT NOT NULL,
        countryIssued VARCHAR(2) NULL,
        documentNumber VARCHAR(100) NULL,
        issueDate DATE NULL,
        expirationDate DATE NULL,
        documentFileName VARCHAR(500) NULL,
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL,
        PRIMARY KEY (id),
        KEY personDocuments_personId_idx (personId),
        KEY personDocuments_documentTypeId_idx (documentTypeId),
        CONSTRAINT personDocuments_personId_fk
          FOREIGN KEY (personId) REFERENCES people(id)
          ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT personDocuments_documentTypeId_fk
          FOREIGN KEY (documentTypeId) REFERENCES documentTypes(id)
          ON DELETE RESTRICT ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    logger.info("personDocuments table created.");
  } else {
    const [cols] = await db.sequelize.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'personDocuments'
         AND COLUMN_NAME = 'countryIssued'`
    );
    if (!cols.length) {
      await db.sequelize.query(
        `ALTER TABLE personDocuments ADD COLUMN countryIssued VARCHAR(2) NULL AFTER documentTypeId`
      );
      logger.info("personDocuments.countryIssued column added.");
    }

    const [numberCols] = await db.sequelize.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'personDocuments'
         AND COLUMN_NAME = 'documentNumber'`
    );
    if (!numberCols.length) {
      await db.sequelize.query(
        `ALTER TABLE personDocuments
         ADD COLUMN documentNumber VARCHAR(100) NULL
         AFTER countryIssued`
      );
      logger.info("personDocuments.documentNumber column added.");
    }

    const [fileCols] = await db.sequelize.query(
      `SELECT IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'personDocuments'
         AND COLUMN_NAME = 'documentFileName'`
    );
    if (fileCols.length && fileCols[0].IS_NULLABLE === "NO") {
      await db.sequelize.query(
        `ALTER TABLE personDocuments
         MODIFY COLUMN documentFileName VARCHAR(500) NULL`
      );
      logger.info("personDocuments.documentFileName made nullable.");
    }

    const [expirationCols] = await db.sequelize.query(
      `SELECT IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'personDocuments'
         AND COLUMN_NAME = 'expirationDate'`
    );
    if (expirationCols.length && expirationCols[0].IS_NULLABLE === "NO") {
      await db.sequelize.query(
        `ALTER TABLE personDocuments
         MODIFY COLUMN expirationDate DATE NULL`
      );
      logger.info("personDocuments.expirationDate made nullable.");
    }
  }
};

const ensurePersonDocumentSpecializationsTable = async () => {
  const [tables] = await db.sequelize.query(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'personDocumentSpecializations'`
  );
  if (tables.length) return;

  await db.sequelize.query(`
    CREATE TABLE personDocumentSpecializations (
      id INT NOT NULL AUTO_INCREMENT,
      personDocumentId INT NOT NULL,
      documentTypeSpecializationId INT NOT NULL,
      specializationDate DATE NOT NULL,
      documentFileName VARCHAR(500) NOT NULL,
      createdAt DATETIME NOT NULL,
      updatedAt DATETIME NOT NULL,
      PRIMARY KEY (id),
      UNIQUE KEY personDocumentSpecializations_document_specialization_unique
        (personDocumentId, documentTypeSpecializationId),
      KEY personDocumentSpecializations_documentTypeSpecializationId_idx (documentTypeSpecializationId),
      CONSTRAINT personDocumentSpecializations_personDocumentId_fk
        FOREIGN KEY (personDocumentId) REFERENCES personDocuments(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT personDocumentSpecializations_documentTypeSpecializationId_fk
        FOREIGN KEY (documentTypeSpecializationId) REFERENCES documentTypeSpecializations(id)
        ON DELETE RESTRICT ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  logger.info("personDocumentSpecializations table created.");
};

const ensureDocumentTypeSpecializationsTable = async () => {
  await db.sequelize.query(`
    CREATE TABLE IF NOT EXISTS documentTypeSpecializations (
      id INT NOT NULL AUTO_INCREMENT,
      documentTypeId INT NOT NULL,
      name VARCHAR(100) NOT NULL,
      createdAt DATETIME NOT NULL,
      updatedAt DATETIME NOT NULL,
      PRIMARY KEY (id),
      UNIQUE KEY documentTypeSpecializations_type_name_unique (documentTypeId, name),
      CONSTRAINT documentTypeSpecializations_documentTypeId_fk
        FOREIGN KEY (documentTypeId) REFERENCES documentTypes(id)
        ON DELETE CASCADE ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
};

/** Link person specializations to a list entry; existing free-text specializations are removed once. */
const ensurePersonDocumentSpecializationListLink = async () => {
  const [cols] = await db.sequelize.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'personDocumentSpecializations'
       AND COLUMN_NAME = 'documentTypeSpecializationId'`
  );
  if (cols.length) return;

  const [rows] = await db.sequelize.query(
    `SELECT documentFileName FROM personDocumentSpecializations`
  );
  for (const row of rows) {
    try {
      fs.unlinkSync(`documents/${row.documentFileName}`);
    } catch {
      // File already gone.
    }
  }
  await db.sequelize.query(`DELETE FROM personDocumentSpecializations`);
  await db.sequelize.query(`ALTER TABLE personDocumentSpecializations DROP COLUMN name`);
  await db.sequelize.query(`
    ALTER TABLE personDocumentSpecializations
      ADD COLUMN documentTypeSpecializationId INT NOT NULL AFTER personDocumentId,
      ADD UNIQUE KEY personDocumentSpecializations_document_specialization_unique
        (personDocumentId, documentTypeSpecializationId),
      ADD CONSTRAINT personDocumentSpecializations_documentTypeSpecializationId_fk
        FOREIGN KEY (documentTypeSpecializationId) REFERENCES documentTypeSpecializations(id)
        ON DELETE RESTRICT ON UPDATE CASCADE
  `);
  logger.info(
    `personDocumentSpecializations linked to the specialization list; ${rows.length} free-text specialization(s) removed.`
  );
};

const ensureWorkerRoleSpecializationsTable = async () => {
  await db.sequelize.query(`
    CREATE TABLE IF NOT EXISTS workerRoleSpecializations (
      id INT NOT NULL AUTO_INCREMENT,
      workerRoleId INT NOT NULL,
      documentTypeSpecializationId INT NOT NULL,
      createdAt DATETIME NOT NULL,
      updatedAt DATETIME NOT NULL,
      PRIMARY KEY (id),
      UNIQUE KEY workerRoleSpecializations_role_specialization_unique
        (workerRoleId, documentTypeSpecializationId),
      CONSTRAINT workerRoleSpecializations_workerRoleId_fk
        FOREIGN KEY (workerRoleId) REFERENCES workerRoles(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT workerRoleSpecializations_documentTypeSpecializationId_fk
        FOREIGN KEY (documentTypeSpecializationId) REFERENCES documentTypeSpecializations(id)
        ON DELETE RESTRICT ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
};

const ensureWorkerRoleDocumentType = async () => {
  const [docTypeCols] = await db.sequelize.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'workerRoles'
       AND COLUMN_NAME = 'documentTypeId'`
  );
  if (!docTypeCols.length) {
    await db.sequelize.query(
      `ALTER TABLE workerRoles ADD COLUMN documentTypeId INT NULL AFTER description`
    );
    await db.sequelize.query(
      `ALTER TABLE workerRoles
       ADD CONSTRAINT workerRoles_documentTypeId_fk
       FOREIGN KEY (documentTypeId) REFERENCES documentTypes(id)
       ON DELETE SET NULL ON UPDATE CASCADE`
    );
    logger.info("workerRoles.documentTypeId column added.");
  }

  const [legacyCols] = await db.sequelize.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'workerRoles'
       AND COLUMN_NAME = 'licenseType'`
  );
  if (legacyCols.length) {
    await db.sequelize.query(`ALTER TABLE workerRoles DROP COLUMN licenseType`);
    logger.info("workerRoles.licenseType column removed.");
  }

  const [licenseRequiredCols] = await db.sequelize.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'workerRoles'
       AND COLUMN_NAME = 'licenseRequired'`
  );
  if (licenseRequiredCols.length) {
    await db.sequelize.query(`ALTER TABLE workerRoles DROP COLUMN licenseRequired`);
    logger.info("workerRoles.licenseRequired column removed.");
  }
};

const ensureWorkerRoleRequiredDocuments = async () => {
  const [tables] = await db.sequelize.query(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'workerRoleDocumentTypes'`
  );
  if (!tables.length) {
    await db.sequelize.query(`
      CREATE TABLE workerRoleDocumentTypes (
        id INT NOT NULL AUTO_INCREMENT,
        workerRoleId INT NOT NULL,
        documentTypeId INT NOT NULL,
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL,
        PRIMARY KEY (id),
        UNIQUE KEY workerRoleDocumentTypes_role_type_unique (workerRoleId, documentTypeId),
        KEY workerRoleDocumentTypes_workerRoleId_idx (workerRoleId),
        KEY workerRoleDocumentTypes_documentTypeId_idx (documentTypeId),
        CONSTRAINT workerRoleDocumentTypes_workerRoleId_fk
          FOREIGN KEY (workerRoleId) REFERENCES workerRoles (id)
          ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT workerRoleDocumentTypes_documentTypeId_fk
          FOREIGN KEY (documentTypeId) REFERENCES documentTypes (id)
          ON DELETE RESTRICT ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    logger.info("workerRoleDocumentTypes table created.");
  }

  await db.sequelize.query(`
    INSERT INTO workerRoleDocumentTypes (workerRoleId, documentTypeId, createdAt, updatedAt)
    SELECT wr.id, wr.documentTypeId, NOW(), NOW()
    FROM workerRoles wr
    WHERE wr.documentTypeId IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM workerRoleDocumentTypes j
        WHERE j.workerRoleId = wr.id AND j.documentTypeId = wr.documentTypeId
      )
  `);
};

const ensureNamedUniqueIndexes = async () => {
  const renames = [
    ["roles", "roleName", "roles_roleName_unique"],
    ["users", "email", "users_email_unique"],
  ];

  for (const [tableName, oldName, newName] of renames) {
    const [indexes] = await db.sequelize.query(`SHOW INDEX FROM \`${tableName}\``);
    const names = new Set(indexes.map((i) => i.Key_name));
    if (names.has(newName)) {
      // Drop any leftover duplicate unique indexes (roleName_2, email_3, etc.)
      for (const name of names) {
        if (name === "PRIMARY" || name === newName) continue;
        await db.sequelize.query(`ALTER TABLE \`${tableName}\` DROP INDEX \`${name}\``);
        logger.info(`${tableName}.${name} duplicate index removed.`);
      }
      continue;
    }
    if (names.has(oldName)) {
      await db.sequelize.query(
        `ALTER TABLE \`${tableName}\` RENAME INDEX \`${oldName}\` TO \`${newName}\``
      );
      logger.info(`${tableName}.${oldName} renamed to ${newName}.`);
    }
  }
};

const ensureTripTravelOptionsTable = async () => {
  const [tables] = await db.sequelize.query(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'tripTravelOptions'`
  );
  if (!tables.length) {
    await db.sequelize.query(`
      CREATE TABLE tripTravelOptions (
        id INT NOT NULL AUTO_INCREMENT,
        tripId INT NOT NULL,
        description VARCHAR(500) NOT NULL,
        priceAdjustment DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        setNumber INT NOT NULL DEFAULT 1,
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL,
        PRIMARY KEY (id),
        KEY tripTravelOptions_tripId_idx (tripId),
        CONSTRAINT tripTravelOptions_tripId_fk
          FOREIGN KEY (tripId) REFERENCES trips (id)
          ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    logger.info("tripTravelOptions table created.");
    return;
  }

  const [columns] = await db.sequelize.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'tripTravelOptions'
       AND COLUMN_NAME = 'setNumber'`
  );
  if (!columns.length) {
    await db.sequelize.query(`
      ALTER TABLE tripTravelOptions
      ADD COLUMN setNumber INT NOT NULL DEFAULT 1 AFTER priceAdjustment
    `);
    logger.info("tripTravelOptions.setNumber column added.");
  }
};

const ensureTripPeopleRoleOptionsTable = async () => {
  const [tables] = await db.sequelize.query(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'tripPeopleRoleOptions'`
  );
  if (tables.length) return;

  await db.sequelize.query(`
    CREATE TABLE tripPeopleRoleOptions (
      id INT NOT NULL AUTO_INCREMENT,
      tripPeopleRoleId INT NOT NULL,
      tripTravelOptionId INT NOT NULL,
      selected TINYINT(1) NOT NULL DEFAULT 0,
      createdAt DATETIME NOT NULL,
      updatedAt DATETIME NOT NULL,
      PRIMARY KEY (id),
      UNIQUE KEY tripPeopleRoleOptions_assignment_option_uk (tripPeopleRoleId, tripTravelOptionId),
      KEY tripPeopleRoleOptions_tripPeopleRoleId_idx (tripPeopleRoleId),
      KEY tripPeopleRoleOptions_tripTravelOptionId_idx (tripTravelOptionId),
      CONSTRAINT tripPeopleRoleOptions_tripPeopleRoleId_fk
        FOREIGN KEY (tripPeopleRoleId) REFERENCES tripPeopleRoles (id)
        ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT tripPeopleRoleOptions_tripTravelOptionId_fk
        FOREIGN KEY (tripTravelOptionId) REFERENCES tripTravelOptions (id)
        ON DELETE CASCADE ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  logger.info("tripPeopleRoleOptions table created.");
};

const ensureTripPeopleRoleExpensesTable = async () => {
  if (await tableExists("tripPeopleRoleExpenses")) return;

  await db.sequelize.query(`
    CREATE TABLE tripPeopleRoleExpenses (
      id INT NOT NULL AUTO_INCREMENT,
      tripPeopleRoleId INT NOT NULL,
      description VARCHAR(255) NOT NULL,
      cost DECIMAL(10,2) NOT NULL,
      createdAt DATETIME NOT NULL,
      updatedAt DATETIME NOT NULL,
      PRIMARY KEY (id),
      KEY tripPeopleRoleExpenses_tripPeopleRoleId_idx (tripPeopleRoleId),
      CONSTRAINT tripPeopleRoleExpenses_tripPeopleRoleId_fk
        FOREIGN KEY (tripPeopleRoleId) REFERENCES tripPeopleRoles (id)
        ON DELETE CASCADE ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  logger.info("tripPeopleRoleExpenses table created.");
};

const ensureTripDaysBeforeAfter = async () => {
  for (const table of ["tripTravelOptions", "tripPeopleRoleExpenses"]) {
    for (const name of ["daysBefore", "daysAfter"]) {
      const [cols] = await db.sequelize.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = :table
           AND COLUMN_NAME = :name`,
        { replacements: { table, name } }
      );
      if (!cols.length) {
        await db.sequelize.query(`ALTER TABLE ${table} ADD COLUMN ${name} INT NOT NULL DEFAULT 0`);
        logger.info(`${table}.${name} column added.`);
      }
    }
  }
};

const ensureEmailPicturesTable = async () => {
  if (await tableExists("emailPictures")) return;

  await db.sequelize.query(`
    CREATE TABLE emailPictures (
      id INT NOT NULL AUTO_INCREMENT,
      orgId INT NOT NULL,
      name VARCHAR(100) NOT NULL,
      fileName VARCHAR(255) NOT NULL,
      contentType VARCHAR(50) NOT NULL,
      sizeBytes INT NOT NULL,
      createdAt DATETIME NOT NULL,
      updatedAt DATETIME NOT NULL,
      PRIMARY KEY (id),
      KEY emailPictures_orgId_idx (orgId),
      CONSTRAINT emailPictures_orgId_fk
        FOREIGN KEY (orgId) REFERENCES organizations (id)
        ON DELETE CASCADE ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  logger.info("emailPictures table created.");
};

const ensureMedicalConditionsTable = async () => {
  const [tables] = await db.sequelize.query(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'medicalConditions'`
  );
  if (tables.length) return;

  await db.sequelize.query(`
    CREATE TABLE medicalConditions (
      id INT NOT NULL AUTO_INCREMENT,
      orgId INT NOT NULL,
      name VARCHAR(50) NOT NULL,
      createdAt DATETIME NOT NULL,
      updatedAt DATETIME NOT NULL,
      PRIMARY KEY (id),
      UNIQUE KEY medicalConditions_org_name_unique (orgId, name),
      KEY medicalConditions_orgId_idx (orgId),
      CONSTRAINT medicalConditions_orgId_fk
        FOREIGN KEY (orgId) REFERENCES organizations (id)
        ON DELETE CASCADE ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  logger.info("medicalConditions table created.");
};

/** Feature 64: table → columns stored encrypted (`enc1:` text). */
export const ENCRYPTED_COLUMNS = {
  people: [
    "birthDate",
    "addLine1",
    "addLine2",
    "city",
    "state_prov",
    "postalCode",
    "phoneNumber",
    "emergencyContactName",
    "emergencyContactPhoneNumber",
    "hasAllergies",
    "allergiesDescription",
    "takesMedication",
    "medicalConditionIds",
  ],
  tripPeopleRoles: ["isPregnant", "pregnancyDueDate"],
  personDocuments: ["documentNumber"],
  donors: ["addLine1", "addLine2", "city", "state_prov", "postalCode", "phoneNumber"],
};

const ensureEncryptedColumns = async () => {
  for (const [table, columns] of Object.entries(ENCRYPTED_COLUMNS)) {
    for (const column of columns) {
      const [rows] = await db.sequelize.query(
        `SELECT DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = :table
           AND COLUMN_NAME = :column`,
        { replacements: { table, column } }
      );
      if (!rows.length) {
        await db.sequelize.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` TEXT NULL`);
        logger.info(`${table}.${column} column added.`);
      } else if (rows[0].DATA_TYPE !== "text") {
        await db.sequelize.query(`ALTER TABLE \`${table}\` MODIFY COLUMN \`${column}\` TEXT NULL`);
        logger.info(`${table}.${column} column changed to TEXT for encryption.`);
      }
    }
  }
};

const ensureTripRequirePassport = async () => {
  const [rows] = await db.sequelize.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'trips'
       AND COLUMN_NAME = 'requirePassport'`
  );
  if (rows.length) return;

  await db.sequelize.query(
    `ALTER TABLE trips
     ADD COLUMN requirePassport TINYINT(1) NOT NULL DEFAULT 0
     AFTER participantCost`
  );
  logger.info("trips.requirePassport column added.");
};

const ensureTripArrivalPdfFileName = async () => {
  const [rows] = await db.sequelize.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'trips'
       AND COLUMN_NAME = 'arrivalPdfFileName'`
  );
  if (rows.length) return;

  await db.sequelize.query(
    `ALTER TABLE trips
     ADD COLUMN arrivalPdfFileName VARCHAR(500) NULL
     AFTER requirePassport`
  );
  logger.info("trips.arrivalPdfFileName column added.");
};

const ensureEmailTypes = async () => {
  const [tables] = await db.sequelize.query(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'emailTypes'`
  );
  if (!tables.length) {
    await db.sequelize.query(`
      CREATE TABLE emailTypes (
        id INT NOT NULL AUTO_INCREMENT,
        typeCode VARCHAR(255) NOT NULL,
        description VARCHAR(255) NOT NULL,
        eventCode VARCHAR(255) NOT NULL,
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL,
        PRIMARY KEY (id),
        UNIQUE KEY emailTypes_typeCode_unique (typeCode)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    logger.info("emailTypes table created.");
  }

  const [typeCol] = await db.sequelize.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'emailTemplates'
       AND COLUMN_NAME = 'emailTypeId'`
  );
  if (!typeCol.length) {
    await db.sequelize.query(
      "ALTER TABLE emailTemplates ADD COLUMN emailTypeId INT NULL"
    );
    await db.sequelize.query(
      `ALTER TABLE emailTemplates
       ADD CONSTRAINT emailtemplates_emailTypeId_fk
       FOREIGN KEY (emailTypeId) REFERENCES emailTypes(id)
       ON DELETE RESTRICT ON UPDATE CASCADE`
    );
    logger.info("emailTemplates.emailTypeId column added.");
  }

  const [bodyCol] = await db.sequelize.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'emailTemplates'
       AND COLUMN_NAME = 'emailBody'`
  );
  if (!bodyCol.length) {
    await db.sequelize.query("ALTER TABLE emailTemplates ADD COLUMN emailBody TEXT NULL");
    logger.info("emailTemplates.emailBody column added.");
  }
};

const ensureEmailTemplateToAddress = async () => {
  const [cols] = await db.sequelize.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'emailTemplates'
       AND COLUMN_NAME = 'toAddress'`
  );
  if (!cols.length) {
    await db.sequelize.query("ALTER TABLE emailTemplates ADD COLUMN toAddress VARCHAR(1000) NULL");
    logger.info("emailTemplates.toAddress column added.");
  }
};

const ensureEmailLogToEmailLength = async () => {
  const [cols] = await db.sequelize.query(
    `SELECT CHARACTER_MAXIMUM_LENGTH AS maxLength FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'emailLogs'
       AND COLUMN_NAME = 'toEmail'`
  );
  if (cols.length && Number(cols[0].maxLength) < 1000) {
    await db.sequelize.query("ALTER TABLE emailLogs MODIFY COLUMN toEmail VARCHAR(1000) NOT NULL");
    logger.info("emailLogs.toEmail widened to 1000 characters.");
  }
};

const ensureEmailLogSource = async () => {
  const columns = [
    ["emailTemplateId", "emailTemplates"],
    ["tripId", "trips"],
    ["personId", "people"],
  ];
  for (const [name, table] of columns) {
    const [cols] = await db.sequelize.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'emailLogs'
         AND COLUMN_NAME = :name`,
      { replacements: { name } }
    );
    if (cols.length) continue;
    await db.sequelize.query(`ALTER TABLE emailLogs ADD COLUMN ${name} INT NULL`);
    await db.sequelize.query(
      `ALTER TABLE emailLogs
       ADD CONSTRAINT emailLogs_${name}_fk
       FOREIGN KEY (${name}) REFERENCES ${table}(id)
       ON DELETE SET NULL ON UPDATE CASCADE`
    );
    logger.info(`emailLogs.${name} column added.`);
  }
};

const ensureScheduledEmailSendsTable = async () => {
  const [tables] = await db.sequelize.query(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'scheduledEmailSends'`
  );
  if (tables.length) return;

  await db.sequelize.query(`
    CREATE TABLE scheduledEmailSends (
      id INT NOT NULL AUTO_INCREMENT,
      emailTemplateId INT NOT NULL,
      tripId INT NOT NULL,
      personId INT NOT NULL,
      sendDate DATE NOT NULL,
      status ENUM('sent','skipped','failed') NOT NULL,
      reason VARCHAR(1000) NULL,
      emailLogId INT NULL,
      createdAt DATETIME NOT NULL,
      updatedAt DATETIME NOT NULL,
      PRIMARY KEY (id),
      UNIQUE KEY scheduledEmailSends_template_trip_person_date_unique (emailTemplateId, tripId, personId, sendDate),
      KEY scheduledEmailSends_tripId_idx (tripId),
      KEY scheduledEmailSends_personId_idx (personId),
      KEY scheduledEmailSends_emailLogId_idx (emailLogId),
      CONSTRAINT scheduledEmailSends_emailTemplateId_fk
        FOREIGN KEY (emailTemplateId) REFERENCES emailTemplates (id)
        ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT scheduledEmailSends_tripId_fk
        FOREIGN KEY (tripId) REFERENCES trips (id)
        ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT scheduledEmailSends_personId_fk
        FOREIGN KEY (personId) REFERENCES people (id)
        ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT scheduledEmailSends_emailLogId_fk
        FOREIGN KEY (emailLogId) REFERENCES emailLogs (id)
        ON DELETE SET NULL ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  logger.info("scheduledEmailSends table created.");
};

const ensureEmailTemplateSchedule = async () => {
  const columns = [
    ["scheduleRule", "VARCHAR(20) NULL"],
    ["scheduleDaysBefore", "INT NULL"],
  ];
  for (const [name, definition] of columns) {
    const [cols] = await db.sequelize.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'emailTemplates'
         AND COLUMN_NAME = :name`,
      { replacements: { name } }
    );
    if (!cols.length) {
      await db.sequelize.query(`ALTER TABLE emailTemplates ADD COLUMN ${name} ${definition}`);
      logger.info(`emailTemplates.${name} column added.`);
    }
  }
};

const ensureEmailTokens = async () => {
  const [tables] = await db.sequelize.query(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'emailTokens'`
  );
  if (tables.length) return;

  await db.sequelize.query(`
    CREATE TABLE emailTokens (
      id INT NOT NULL AUTO_INCREMENT,
      tokenCode VARCHAR(100) NOT NULL,
      description VARCHAR(255) NOT NULL,
      valueSource VARCHAR(100) NOT NULL,
      createdAt DATETIME NOT NULL,
      updatedAt DATETIME NOT NULL,
      PRIMARY KEY (id),
      UNIQUE KEY emailTokens_tokenCode_unique (tokenCode)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  logger.info("emailTokens table created.");
};

const ensureTripPrimaryLeader = async () => {
  const [rows] = await db.sequelize.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'tripPeopleRoles'
       AND COLUMN_NAME = 'isPrimaryLeader'`
  );
  if (!rows.length) {
    await db.sequelize.query(
      "ALTER TABLE tripPeopleRoles ADD COLUMN isPrimaryLeader TINYINT(1) NOT NULL DEFAULT 0"
    );
    logger.info("tripPeopleRoles.isPrimaryLeader column added.");
  }

  const leaderRole = await db.role.findOne({ where: { roleName: "Trip Leader" } });
  if (!leaderRole) return;

  const [updated] = await db.sequelize.query(
    `UPDATE tripPeopleRoles t
     JOIN (
       SELECT l.tripId, MIN(l.id) AS firstId
       FROM tripPeopleRoles l
       WHERE l.roleId = :roleId
         AND l.tripId NOT IN (
           SELECT p.tripId FROM (
             SELECT tripId FROM tripPeopleRoles WHERE roleId = :roleId AND isPrimaryLeader = 1
           ) p
         )
       GROUP BY l.tripId
     ) firsts ON firsts.firstId = t.id
     SET t.isPrimaryLeader = 1`,
    { replacements: { roleId: leaderRole.id } }
  );
  if (updated?.affectedRows) {
    logger.info(`Marked primary trip leader on ${updated.affectedRows} trip(s).`);
  }
};

const ensureTripDeposit = async () => {
  const [rows] = await db.sequelize.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'trips'
       AND COLUMN_NAME = 'deposit'`
  );
  if (rows.length) return;

  await db.sequelize.query(
    `ALTER TABLE trips
     ADD COLUMN deposit DECIMAL(10, 2) NULL
     AFTER participantCost`
  );
  logger.info("trips.deposit column added.");
};

const ensureUserLoginLockFields = async () => {
  const [rows] = await db.sequelize.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'users'
       AND COLUMN_NAME IN ('failedLoginCount', 'lockedUntil')`
  );
  const existing = new Set(rows.map((r) => r.COLUMN_NAME));
  if (!existing.has("failedLoginCount")) {
    await db.sequelize.query(
      "ALTER TABLE users ADD COLUMN failedLoginCount INT NOT NULL DEFAULT 0 AFTER passwordSetByUser"
    );
    logger.info("users.failedLoginCount column added.");
  }
  if (!existing.has("lockedUntil")) {
    await db.sequelize.query("ALTER TABLE users ADD COLUMN lockedUntil DATETIME NULL AFTER failedLoginCount");
    logger.info("users.lockedUntil column added.");
  }
};

const ensureTripFlightSegmentCabinAndSeat = async () => {
  const [tables] = await db.sequelize.query(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'tripFlightSegments'`
  );
  if (!tables.length) return;

  const [columns] = await db.sequelize.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'tripFlightSegments'
       AND COLUMN_NAME IN ('cabinClass', 'seatNumber', 'segmentType')`
  );
  const have = new Set(columns.map((c) => c.COLUMN_NAME));

  if (!have.has("cabinClass")) {
    await db.sequelize.query(
      `ALTER TABLE tripFlightSegments
       ADD COLUMN cabinClass VARCHAR(50) NULL AFTER arrivalTime`
    );
    logger.info("tripFlightSegments.cabinClass column added.");
  }
  if (!have.has("seatNumber")) {
    await db.sequelize.query(
      `ALTER TABLE tripFlightSegments
       ADD COLUMN seatNumber VARCHAR(20) NULL AFTER cabinClass`
    );
    logger.info("tripFlightSegments.seatNumber column added.");
  }
  if (!have.has("segmentType")) {
    await db.sequelize.query(
      `ALTER TABLE tripFlightSegments
       ADD COLUMN segmentType ENUM('arrival', 'return') NOT NULL DEFAULT 'arrival'
       AFTER tripFlightId`
    );
    logger.info("tripFlightSegments.segmentType column added.");
  }

  // Prefer unique (tripFlightId, segmentType, segmentNumber); drop older flight+number unique if present.
  const [indexes] = await db.sequelize.query(
    `SHOW INDEX FROM tripFlightSegments WHERE Non_unique = 0`
  );
  const uniqueNames = new Set(indexes.map((r) => r.Key_name).filter((n) => n !== "PRIMARY"));
  if (!uniqueNames.has("trip_flight_segments_flight_type_number_unique")) {
    // Drop any unique that is only (tripFlightId, segmentNumber)
    const byKey = new Map();
    for (const row of indexes) {
      if (row.Key_name === "PRIMARY") continue;
      if (!byKey.has(row.Key_name)) byKey.set(row.Key_name, []);
      byKey.get(row.Key_name).push(row.Column_name);
    }
    for (const [name, cols] of byKey.entries()) {
      if (cols.length === 2 && cols.includes("tripFlightId") && cols.includes("segmentNumber")) {
        await db.sequelize.query(`ALTER TABLE tripFlightSegments DROP INDEX \`${name}\``);
        logger.info(`Dropped legacy unique index ${name} on tripFlightSegments.`);
      }
    }
    await db.sequelize.query(
      `ALTER TABLE tripFlightSegments
       ADD UNIQUE INDEX trip_flight_segments_flight_type_number_unique
       (tripFlightId, segmentType, segmentNumber)`
    );
    logger.info("tripFlightSegments unique (tripFlightId, segmentType, segmentNumber) added.");
  }
};

const ensureLanguageCatalog = async () => {
  const [tables] = await db.sequelize.query(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'languages'`
  );
  if (!tables.length) return;

  const Op = db.Sequelize.Op;
  for (const row of LANGUAGE_SEED) {
    const existing = await db.language.findOne({ where: { code: row.code } });
    if (!existing) {
      await db.language.create(row);
    } else if (existing.name !== row.name) {
      await existing.update({ name: row.name });
    }
  }

  const keep = new Set(LANGUAGE_SEED.map((row) => row.code));
  const extras = await db.language.findAll({
    where: { code: { [Op.notIn]: [...keep] } },
  });
  for (const extra of extras) {
    const used = await db.personLanguage.count({ where: { languageId: extra.id } });
    if (used) continue;
    await extra.destroy();
    logger.info(`Removed language ${extra.code} (${extra.name}) not in the Western Hemisphere seed.`);
  }
};

export const ensureSchema = async () => {
  await ensureNamedUniqueIndexes();
  await ensureUserLoginLockFields();
  await ensureEmailTemplateOrgNullable();
  await ensureTripPeopleRoleParticipantCost();
  await ensureTripRequirePassport();
  await ensureTripArrivalPdfFileName();
  await ensureTripDeposit();
  await ensureEmailTypes();
  await ensureEmailTokens();
  await ensureEmailTemplateToAddress();
  await ensureEmailTemplateSchedule();
  await ensureEmailLogToEmailLength();
  await ensureEmailLogSource();
  await ensureScheduledEmailSendsTable();
  await ensureTripPrimaryLeader();
  await ensureTripFlightSegmentCabinAndSeat();
  await ensureOrganizationWebsiteUrl();
  await ensureOrganizationSubdomain();
  await ensureOrganizationAgreementFileName();
  await ensureOrganizationMedicalAgreementFileName();
  await ensureOrganizationTestMode();
  await ensureDonorPersonId();
  await ensureTripPeopleRoleTripWorkerRoleId();
  await ensurePersonProfileFields();
  await ensureTripPeopleRoleApplicationFields();
  await ensureTripPeopleRoleStatus();
  await ensureTripApplicantRoleRemoved();
  await ensureDocumentTypesTable();
  await ensurePersonDocumentsTable();
  await ensureDocumentTypeSpecializationsTable();
  await ensurePersonDocumentSpecializationsTable();
  await ensurePersonDocumentSpecializationListLink();
  await ensureWorkerRoleDocumentType();
  await ensureWorkerRoleRequiredDocuments();
  await ensureWorkerRoleSpecializationsTable();
  await ensureTripTravelOptionsTable();
  await ensureTripPeopleRoleOptionsTable();
  await ensureTripPeopleRoleExpensesTable();
  await ensureTripDaysBeforeAfter();
  await ensureEmailPicturesTable();
  await ensureMedicalConditionsTable();
  await ensureEncryptedColumns();
  await ensureLanguageCatalog();
};

export default ensureSchema;

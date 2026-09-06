import db from "../models/index.js";
import logger from "../config/logger.js";
import fs from "fs";

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
    ["birthDate", "DATE NULL"],
    ["gender", "ENUM('male', 'female') NULL"],
    ["emergencyContactName", "VARCHAR(255) NULL"],
    ["emergencyContactPhoneCountryCode", "VARCHAR(10) NULL"],
    ["emergencyContactPhoneNumber", "VARCHAR(30) NULL"],
    ["hasAllergies", "TINYINT(1) NULL"],
    ["allergiesDescription", "TEXT NULL"],
    ["takesMedication", "TINYINT(1) NULL"],
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
    } else {
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
        expirationDate DATE NOT NULL,
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
  }
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
      `ALTER TABLE workerRoles ADD COLUMN documentTypeId INT NULL AFTER licenseRequired`
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

const ensurePersonMedicalConditionsTable = async () => {
  const [tables] = await db.sequelize.query(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'personMedicalConditions'`
  );
  if (tables.length) return;

  await db.sequelize.query(`
    CREATE TABLE personMedicalConditions (
      id INT NOT NULL AUTO_INCREMENT,
      personId INT NOT NULL,
      medicalConditionId INT NOT NULL,
      createdAt DATETIME NOT NULL,
      updatedAt DATETIME NOT NULL,
      PRIMARY KEY (id),
      UNIQUE KEY personMedicalConditions_person_condition_unique (personId, medicalConditionId),
      KEY personMedicalConditions_personId_idx (personId),
      KEY personMedicalConditions_medicalConditionId_idx (medicalConditionId),
      CONSTRAINT personMedicalConditions_personId_fk
        FOREIGN KEY (personId) REFERENCES people (id)
        ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT personMedicalConditions_medicalConditionId_fk
        FOREIGN KEY (medicalConditionId) REFERENCES medicalConditions (id)
        ON DELETE CASCADE ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  logger.info("personMedicalConditions table created.");
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

export const ensureSchema = async () => {
  await ensureNamedUniqueIndexes();
  await ensureEmailTemplateOrgNullable();
  await ensureTripPeopleRoleParticipantCost();
  await ensureTripRequirePassport();
  await ensureOrganizationWebsiteUrl();
  await ensureOrganizationSubdomain();
  await ensureOrganizationAgreementFileName();
  await ensureOrganizationMedicalAgreementFileName();
  await ensureTripPeopleRoleTripWorkerRoleId();
  await ensurePersonProfileFields();
  await ensureTripPeopleRoleApplicationFields();
  await ensureTripPeopleRoleStatus();
  await ensureTripApplicantRoleRemoved();
  await ensureDocumentTypesTable();
  await ensurePersonDocumentsTable();
  await ensureWorkerRoleDocumentType();
  await ensureWorkerRoleRequiredDocuments();
  await ensureTripTravelOptionsTable();
  await ensureTripPeopleRoleOptionsTable();
  await ensureMedicalConditionsTable();
  await ensurePersonMedicalConditionsTable();
};

export default ensureSchema;

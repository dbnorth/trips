/**
 * Feature 31 — Person Other Languages
 * Spec: features/feature-31-person-other-languages.md
 */

import request from "supertest";
import app from "../server.js";
import db from "../app/models/index.js";
import {
  syncTestDatabase,
  resetTestDatabase,
  createOrgAdminUser,
  completePersonProfile,
} from "./helpers.js";

describe("Feature 31 — Person Other Languages", () => {
  beforeAll(async () => {
    await syncTestDatabase();
  });

  afterEach(async () => {
    await resetTestDatabase();
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  const spanishRow = async () => {
    const [language] = await db.language.findOrCreate({
      where: { code: "es" },
      defaults: { code: "es", name: "Spanish" },
    });
    return language;
  };

  describe("US-31.2 — Record language, fluency, and medical terminology", () => {
    it("Conversational Spanish with medical terminology is saved on the person", async () => {
      const { authHeader, user } = await createOrgAdminUser({
        email: "lang-save@example.com",
        orgName: "Lang Org",
      });
      const personId = user.personId;
      const spanish = await spanishRow();
      await completePersonProfile(personId);
      const person = await db.person.findByPk(personId);

      const update = await request(app)
        .put(`/trips/people/${personId}`)
        .set(authHeader)
        .send({
          speaksOtherLanguage: true,
          languages: [
            {
              languageId: spanish.id,
              fluency: "conversational",
              knowsMedicalTerminology: true,
            },
          ],
          version: person.version,
        });

      expect(update.status).toBe(200);
      expect(update.body.speaksOtherLanguage).toBe(true);
      expect(update.body.languages).toEqual([
        expect.objectContaining({
          code: "es",
          name: "Spanish",
          fluency: "conversational",
          knowsMedicalTerminology: true,
        }),
      ]);

      const reload = await request(app).get(`/trips/people/${personId}`).set(authHeader);
      expect(reload.status).toBe(200);
      expect(reload.body.languages.map((row) => row.name)).toContain("Spanish");
      expect(reload.body.languages[0].fluency).toBe("conversational");
      expect(reload.body.languages[0].knowsMedicalTerminology).toBe(true);
    });

    it("Prior languages reload on a later person load", async () => {
      const { authHeader, user } = await createOrgAdminUser({
        email: "lang-reload@example.com",
        orgName: "Lang Reload Org",
      });
      const personId = user.personId;
      const spanish = await spanishRow();
      await completePersonProfile(personId);
      const person = await db.person.findByPk(personId);

      const save = await request(app)
        .put(`/trips/people/${personId}`)
        .set(authHeader)
        .send({
          speaksOtherLanguage: true,
          languages: [
            {
              languageId: spanish.id,
              fluency: "conversational",
              knowsMedicalTerminology: true,
            },
          ],
          version: person.version,
        });
      expect(save.status).toBe(200);

      const reload = await request(app).get(`/trips/people/${personId}`).set(authHeader);
      expect(reload.status).toBe(200);
      expect(reload.body.speaksOtherLanguage).toBe(true);
      expect(reload.body.languages).toEqual([
        expect.objectContaining({
          name: "Spanish",
          fluency: "conversational",
          knowsMedicalTerminology: true,
        }),
      ]);
    });

    it("Duplicate language is rejected", async () => {
      const { authHeader, user } = await createOrgAdminUser({
        email: "lang-dup@example.com",
        orgName: "Lang Dup Org",
      });
      const personId = user.personId;
      const spanish = await spanishRow();
      const person = await db.person.findByPk(personId);

      const update = await request(app)
        .put(`/trips/people/${personId}`)
        .set(authHeader)
        .send({
          speaksOtherLanguage: true,
          languages: [
            { languageId: spanish.id, fluency: "basic", knowsMedicalTerminology: false },
            { languageId: spanish.id, fluency: "conversational", knowsMedicalTerminology: true },
          ],
          version: person.version,
        });

      expect(update.status).toBe(400);
      expect(update.body.message).toMatch(/same language/i);
    });
  });

  describe("US-31.3 — Clear languages when the answer is No", () => {
    it("Changing Yes to No removes saved languages", async () => {
      const { authHeader, user } = await createOrgAdminUser({
        email: "lang-clear@example.com",
        orgName: "Lang Clear Org",
      });
      const personId = user.personId;
      const spanish = await spanishRow();
      const person = await db.person.findByPk(personId);

      const save = await request(app)
        .put(`/trips/people/${personId}`)
        .set(authHeader)
        .send({
          speaksOtherLanguage: true,
          languages: [
            { languageId: spanish.id, fluency: "basic", knowsMedicalTerminology: false },
          ],
          version: person.version,
        });
      expect(save.status).toBe(200);

      const clear = await request(app)
        .put(`/trips/people/${personId}`)
        .set(authHeader)
        .send({
          speaksOtherLanguage: false,
          languages: [],
          version: save.body.version,
        });
      expect(clear.status).toBe(200);
      expect(clear.body.speaksOtherLanguage).toBe(false);
      expect(clear.body.languages).toEqual([]);
    });
  });
});

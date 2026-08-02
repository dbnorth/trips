import { mount } from "@vue/test-utils";
import { createVuetify } from "vuetify";
import * as components from "vuetify/components";
import * as directives from "vuetify/directives";
import { createMemoryHistory, createRouter } from "vue-router";
import { applyAuthGuards } from "../src/router.js";

export const vuetify = createVuetify({ components, directives });

const Stub = { template: "<div />" };

const feature1Routes = [
  { path: "/", alias: "/login", name: "login", component: Stub },
  { path: "/home", name: "home", component: Stub },
  { path: "/browse-trips/:tripId", name: "tripBrowse", component: Stub, props: true },
  {
    path: "/browse-trips/:tripId/application",
    name: "editTripApplication",
    component: Stub,
    props: true,
  },
  { path: "/apply/sign-in", name: "applyAuth", component: Stub },
  { path: "/apply/create-account", name: "applyCreateAccount", component: Stub },
  { path: "/organizations", name: "organizations", component: Stub },
  { path: "/document-types", name: "documentTypes", component: Stub },
  { path: "/templates", name: "templates", component: Stub },
  { path: "/worker-roles", name: "workerRoles", component: Stub },
];

export async function createFeature1Router(initialPath = "/") {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: feature1Routes,
  });
  applyAuthGuards(router);
  await router.push(initialPath);
  await router.isReady();
  return router;
}

export async function createTestRouter(initialPath = "/") {
  return createFeature1Router(initialPath);
}

export async function mountWithPlugins(component, options = {}) {
  const { router: providedRouter, global, ...rest } = options;
  const router = providedRouter ?? (await createTestRouter());

  const wrapper = mount(component, {
    ...rest,
    global: {
      plugins: [vuetify, router],
      ...global,
    },
  });

  return { wrapper, router };
}

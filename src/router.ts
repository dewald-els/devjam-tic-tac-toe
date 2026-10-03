import { createRouter, createWebHashHistory, createWebHistory, RouteRecordRaw } from "vue-router"

const routes: RouteRecordRaw[] = [
  { path: "/", component: () => import("./views/Start.vue") },
  { path: "/play", component: () => import("./views/Game.vue") },
  { path: "/:pathMatch(.*)*", redirect: "/" },
]

export default createRouter({
  history: import.meta.env.VITE_ROUTER_HASH ? createWebHashHistory() : createWebHistory(),
  routes,
})

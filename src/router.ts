import { createRouter, createWebHistory, RouteRecordRaw } from "vue-router"

const routes: RouteRecordRaw[] = [
  {
    path: "/",
    component: () => import("./views/Start.vue"),
  },
  {
    path: "/play",
    component: () => import("./views/Game.vue"),
  },
]

export default createRouter({
  history: createWebHistory(),
  routes: routes,
})

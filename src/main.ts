import { createApp } from "vue"
import App from "./App.vue"
import router from "./router"
import { useGame } from "./store"
import "./main.css"

// A game only exists in memory, so /play with no active game goes home.
router.beforeEach((to) => {
  if (to.path === "/play" && useGame().state.mode === "menu") return "/"
})

createApp(App).use(router).mount("#app")

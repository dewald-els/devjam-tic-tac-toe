<script setup lang="ts">
import { ref } from "vue"
import { useRouter } from 'vue-router';
import { useStore } from '../store';
import socket from '../utils/socket';

const store = useStore()
const router = useRouter()

const roomId = ref("")

socket.on("createRoomSuccess", room => {
    store.commit("setRoomId", room.id)
    router.push("/play")
})

socket.on("joinRoomSuccess", room => {
    store.commit("setRoomId", room.id)
    router.push("/play")
})

const onLocalClick = () => {
    store.commit("setIsLocalGame", true)
    router.push("/play")
}

const onJoinClick = () => {
    if (!roomId.value) {
        alert("Enter a Room ID")
        return
    }
    store.commit("setOnlinePlayer", "O")
    store.commit("setRoomId", roomId.value)
    store.commit("setIsLocalGame", false)
    socket.emit("joinRoom", roomId.value)
}

const onCreateClick = () => {
    store.commit("setOnlinePlayer", "X")
    store.commit("setIsLocalGame", false)
    socket.emit("createRoom")
}

</script>
<template>
    <button @click="onLocalClick">Play local</button>

    <section>
        <input type="text" placeholder="Enter room code" v-model.trim="roomId" />
        <button @click="onJoinClick">Join Room</button>
    </section>

    <section>
        <h4>Create Room</h4>
        <button @click="onCreateClick">Create Room</button>
    </section>
</template>
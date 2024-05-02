import { StoreSession } from "npm:@scoopika/types";
import { assertEquals } from "jsr:@std/assert";

const URL = "http://localhost:8000";
const sessionID = crypto.randomUUID();
const userID = crypto.randomUUID();

Deno.test("Create session", async () => {
  
  const mySession: StoreSession = {
    id: sessionID,
    user_id: userID,
    saved_prompts: {},
    user_name: "User",
  }

  const res = await fetch(`${URL}/session/${mySession.id}`, {
    method: "POST",
    body: JSON.stringify({
      ...mySession
    })
  })

  const data = await res.json();
  assertEquals(data.success, true);
})

Deno.test("Get session", async () => {
  const res = await fetch(`${URL}/session/${sessionID}`);
  const data = await res.json();

  assertEquals(data.success, true);
  assertEquals(data.data.id, sessionID);
  assertEquals(data.data.user_id, userID);
})

Deno.test("List user sessions", async () => {
  const res = await fetch(`${URL}/user_sessions/${userID}`);
  const data = await res.json();

  assertEquals(data.success, true);
  assertEquals(typeof data.data, "object");
  assertEquals(data.data?.length, 1);
})

Deno.test("Update session", async () => {
  const res = await fetch(`${URL}/session/${sessionID}`, {
    method: "PUT",
    body: JSON.stringify({
      user_name: "updated_user"
    })
  })
  const data = await res.json();

  assertEquals(data.success, true);
})

Deno.test("Read updated session", async () => {
  const res = await fetch(`${URL}/session/${sessionID}`);
  const data = await res.json();

  assertEquals(data.success, true);
  assertEquals(data.data?.id, sessionID);
  assertEquals(data.data?.user_name, "updated_user");
})

Deno.test("Push to history", async () => {
  const res = await fetch(`${URL}/history/${sessionID}`, {
    method: "POST",
    body: JSON.stringify({
      history: [
        {role: "user", content: "Hello"}
      ]
    })
  })

  const data = await res.json();

  assertEquals(data.success, true);
})

Deno.test("Read history", async () => {
  const res = await fetch(`${URL}/history/${sessionID}`);
  const data = await res.json();

  assertEquals(data.success, true);
  assertEquals(data.data?.length, 1);
})

Deno.test("Push to runs", async () => {
  const res = await fetch(`${URL}/run/${sessionID}`, {
    method: "POST",
    body: JSON.stringify({
      history: [
        {
          role: "user",
          request: {
            message: "Hello"
          }
        }
      ]
    })
  })

  const data = await res.json();
  assertEquals(data.success, true);
})

Deno.test("Read runs", async () => {
  const res = await fetch(`${URL}/run/${sessionID}`)
  const data = await res.json();

  assertEquals(data.success, true);
  assertEquals(data.data?.length, 1);
})

Deno.test("Delete session", async () => {
  const res = await fetch(`${URL}/session/${sessionID}`, {
    method: "DELETE",
  });

  const data = await res.json();
  assertEquals(data.success, true);
})

Deno.test("List empty user sessions", async () => {
  const res = await fetch(`${URL}/user_sessions/${userID}`);
  const data = await res.json();

  assertEquals(data.success, true);
  assertEquals(data.data?.length, 0);
})

Deno.test("Get deleted session", async () => {
  const res = await fetch(`${URL}/session/${sessionID}`);
  const data = await res.json();

  assertEquals(data.success, false);
})

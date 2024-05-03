import * as types from "npm:@scoopika/types@1.3.6";
import { Hono, Context } from "hono";
import { cors } from "hono/cors";

const kv = await Deno.openKv();
const app = new Hono();

app.onError((err, c) => {
  return c.json({
    success: false,
    error: `${err}`
  }, 500)
})

app.use("/*", cors({
  origin: ["*"]
}))

// <TOKEN_MIDDLEWARE >

app.get("/session/:id", async (c: Context) => {

  const id = c.req.param("id");

  if (!id || typeof id !== "string") {
    return c.json({
      success: false,
      error: "Session id not provided"
    }, 400);
  }

  const session = await kv.get<types.StoreSession>(
    ["sessions", id]
  );

  if (!session.value) {
    return c.json({
      success: false,
      error: "Session not found"
    }, 404);
  }

  return c.json({
    success: true,
    data: session.value
  }, 200);
})

app.post("/session/:id", async (c) => {

  const id = c.req.param("id");

  const exist = await kv.get<types.StoreSession>(["sessions", id]);

  if (exist.value) {
    return c.json({
      success: false,
      error: "Session already exist"
    }, 403);
  }

  const session = await c.req.json<types.StoreSession>();

  if (!session || typeof session !== "object") {
    return c.json({
      success: false,
      error: "Invalid session data"
    }, 400);
  }

  await kv.set(["sessions", id], session);
  await kv.set(["history", id], []);
  await kv.set(["runs", id], []);

  if (session.user_id) {
    const exist_user = await kv.get<string[]>(["user_sessions", session.user_id]);
    let sessionsIDs = [id];

    if (exist_user.value) {
      sessionsIDs = [...exist_user.value, id];
    }

    await kv.set(
      ["user_sessions", session.user_id],
      sessionsIDs
    );
  }

  return c.json({
    success: true
  }, 200);
})

app.delete("/session/:id", async (c) => {
  const id = c.req.param("id");

  const exist = await kv.get<types.StoreSession>(["sessions", id]);

  if (!exist.value) {
    return c.json({
      success: false,
      error: "Session not found"
    }, 404);
  }

  await kv.delete(["sessions", id]);
  await kv.delete(["history", id]);
  await kv.delete(["runs", id]);

  const exist_user = exist.value.user_id;

  if (!exist_user) {
    return c.json({
      success: true
    });
  }

  const user_sessions = await kv.get<string[]>(["user_sessions", exist_user]);
  if (!user_sessions.value) {
    return c.json({
      success: true
    })
  }

  const wanted_sessions = user_sessions.value.filter(s => s !== id);
  await kv.set(["user_sessions", exist_user], wanted_sessions);

  return c.json({
    success: true
  })
})

app.put("/session/:id", async (c) => {
  const id = c.req.param("id");

  const newData = await c.req.json<types.StoreSession>();
  const session = await kv.get<types.StoreSession>(["sessions", id]);

  if (!session.value) {
    return c.json({
      success: false,
      error: "Session not found"
    }, 404);
  }

  newData.id = session.value.id;
  newData.user_id = session.value.user_id;

  await kv.set(["sessions", id], {
    ...session.value,
    ...newData
  })

  return c.json({
    success: true
  })
})

app.get("/user_sessions/:id", async (c) => {
  const id = c.req.param("id");

  const sessions = await kv.get<string[]>(["user_sessions", id]);

  if (!sessions.value) {
    return c.json({
      success: true,
      data: []
    });
  }

  return c.json({
    success: true,
    data: sessions.value
  })
})

app.get("history/:id", async (c) => {
  const id = c.req.param("id");

  const exist = await kv.get<types.LLMHistory>(["history", id]);

  if (!exist.value) {
    return c.json({
      success: false,
      error: "Session not found"
    }, 404);
  }

  return c.json({
    success: true,
    data: exist.value
  })
})

app.post("/history/:id", async (c) => {
  const id = c.req.param("id");

  const exist = await kv.get<types.LLMHistory[]>(["history", id]);

  if (!exist.value) {
    return c.json({
      success: false,
      error: "Session not found"
    }, 404);
  }

  const { history } = (await c.req.json<{history: types.LLMHistory[]}>()) || {
    history: []
  };

  if (!history) {
    return c.json({
      success: false,
      error: "Invalid request body"
    }, 400);
  }

  const newHistory: types.LLMHistory[] = [...exist.value, ...history];
  await kv.set(["history", id], newHistory);

  return c.json({
    success: true
  })
})

app.get("/run/:id", async (c) => {

  const id = c.req.param("id");
  const data = await kv.get<types.RunHistory[]>(["runs", id]);

  if (!data.value) {
    return c.json({
      success: false,
      error: "Session not found"
    }, 404);
  }

  return c.json({
    success: true,
    data: data.value
  });
})

app.post("/run/:id", async (c) => {
  const id = c.req.param("id");

  const { history } = await c.req.json<{
    history: types.RunHistory[]
  }>();

  if (!history) {
    return c.json({
      success: false,
      error: "Invalid request body"
    }, 400);
  }

  const exist = await kv.get<types.RunHistory[]>(["runs", id]);

  if (!exist.value) {
    return c.json({
      success: false,
      error: "Session not found"
    }, 404);
  }

  const runs = [...exist.value, ...history];
  await kv.set(["runs", id], runs);

  return c.json({
    success: true,
  });
})

Deno.serve(app.fetch);

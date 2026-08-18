router.post("/", async (req, res) => {
  const { titulo, status } = req.body;
  const userId = req.user.id;

  const result = await db.query(
    "INSERT INTO tickets (titulo, status, user_id) VALUES ($1, $2, $3) RETURNING *",
    [titulo, status, userId]
  );

  res.json(result.rows[0]);
});
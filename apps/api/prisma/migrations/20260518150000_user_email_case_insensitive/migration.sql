


CREATE UNIQUE INDEX IF NOT EXISTS "User_email_lower_unique"
  ON "User" (LOWER("email"));

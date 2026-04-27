CREATE TYPE user_role AS ENUM ('admin', 'editor', 'viewer');

CREATE TABLE IF NOT EXISTS "users" (
	"id" INTEGER NOT NULL UNIQUE GENERATED ALWAYS AS IDENTITY,
	"name" VARCHAR(255) NOT NULL UNIQUE,
	"password" TEXT NOT NULL,
	"avatar" TEXT,
	"email" VARCHAR(255) UNIQUE,
	"phone" VARCHAR(20) UNIQUE,
	"birthday" DATE,
	"role" user_role NOT NULL,
	"created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
	PRIMARY KEY("id")
);


CREATE TABLE IF NOT EXISTS "item" (
	"owner_id" INTEGER,
	"id" INTEGER NOT NULL UNIQUE GENERATED ALWAYS AS IDENTITY,
	"title" VARCHAR(255) NOT NULL,
	"cover_image" TEXT,
	"description" TEXT,
	"created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
	"updated_at" TIMESTAMPTZ,
	"parent_collection" INTEGER,
	PRIMARY KEY("id")
);


CREATE TABLE IF NOT EXISTS "document" (
	"parent_item_id" INTEGER NOT NULL,
	"id" INTEGER NOT NULL UNIQUE GENERATED ALWAYS AS IDENTITY,
	"file_url" TEXT NOT NULL,
	"file_type" VARCHAR(50) NOT NULL,
	"file_size" INTEGER NOT NULL,
	PRIMARY KEY("id")
);


CREATE TABLE IF NOT EXISTS "item_collection" (
	"owner_id" INTEGER,
	"id" INTEGER NOT NULL UNIQUE GENERATED ALWAYS AS IDENTITY,
	"title" VARCHAR(255) NOT NULL,
	"parent_collection" INTEGER,
	PRIMARY KEY("id")
);


ALTER TABLE "item"
ADD FOREIGN KEY("owner_id") REFERENCES "users"("id")
ON UPDATE NO ACTION ON DELETE SET NULL;

ALTER TABLE "document"
ADD FOREIGN KEY("parent_item_id") REFERENCES "item"("id")
ON UPDATE NO ACTION ON DELETE CASCADE;

ALTER TABLE "item_collection"
ADD FOREIGN KEY("owner_id") REFERENCES "users"("id")
ON UPDATE NO ACTION ON DELETE SET NULL;

ALTER TABLE "item"
ADD FOREIGN KEY("parent_collection") REFERENCES "item_collection"("id")
ON UPDATE NO ACTION ON DELETE CASCADE;

ALTER TABLE "item_collection"
ADD FOREIGN KEY("parent_collection") REFERENCES "item_collection"("id")
ON UPDATE NO ACTION ON DELETE CASCADE;

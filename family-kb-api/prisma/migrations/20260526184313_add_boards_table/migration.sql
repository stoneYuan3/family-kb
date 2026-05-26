-- CreateTable
CREATE TABLE "board" (
    "id" SERIAL NOT NULL,
    "week_start" DATE NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "board_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "board_week_start_key" ON "board"("week_start");

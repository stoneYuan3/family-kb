-- CreateTable
CREATE TABLE "mark" (
    "id" SERIAL NOT NULL,
    "boardId" INTEGER NOT NULL,
    "color" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "isTaped" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mark_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "mark" ADD CONSTRAINT "mark_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "board"("id") ON DELETE CASCADE ON UPDATE CASCADE;

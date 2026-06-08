/*
  Warnings:

  - You are about to drop the column `boardId` on the `mark` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `mark` table. All the data in the column will be lost.
  - You are about to drop the column `isTaped` on the `mark` table. All the data in the column will be lost.
  - Added the required column `board_id` to the `mark` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "mark" DROP CONSTRAINT "mark_boardId_fkey";

-- AlterTable
ALTER TABLE "mark" DROP COLUMN "boardId",
DROP COLUMN "createdAt",
DROP COLUMN "isTaped",
ADD COLUMN     "board_id" INTEGER NOT NULL,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "is_taped" BOOLEAN NOT NULL DEFAULT false;

-- AddForeignKey
ALTER TABLE "mark" ADD CONSTRAINT "mark_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "board"("id") ON DELETE CASCADE ON UPDATE CASCADE;

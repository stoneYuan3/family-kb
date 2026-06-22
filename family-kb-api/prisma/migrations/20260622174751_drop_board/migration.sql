/*
  Warnings:

  - You are about to drop the column `board_id` on the `mark` table. All the data in the column will be lost.
  - You are about to drop the `board` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "mark" DROP CONSTRAINT "mark_board_id_fkey";

-- AlterTable
ALTER TABLE "mark" DROP COLUMN "board_id";

-- DropTable
DROP TABLE "board";

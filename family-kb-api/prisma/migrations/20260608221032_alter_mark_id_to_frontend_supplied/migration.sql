/*
  Warnings:

  - The primary key for the `mark` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Changed the type of `id` on the `mark` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "mark" DROP CONSTRAINT "mark_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
ADD CONSTRAINT "mark_pkey" PRIMARY KEY ("id");

-- CreateEnum
CREATE TYPE "FolderType" AS ENUM ('MANUAL', 'SMART');

-- CreateEnum
CREATE TYPE "NoteStatus" AS ENUM ('PENDING', 'ACTIONED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ActionType" AS ENUM ('CALL', 'EMAIL', 'LINK', 'CALENDAR');

-- CreateEnum
CREATE TYPE "ExtractedEntityType" AS ENUM ('PHONE', 'EMAIL', 'URL');

-- CreateTable
CREATE TABLE "users" (
    "user_id" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "avatar_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "resetPasswordOtp" TEXT,
    "resetPasswordExpires" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "folders" (
    "folder_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "folder_name" TEXT NOT NULL,
    "type" "FolderType" NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "folders_pkey" PRIMARY KEY ("folder_id")
);

-- CreateTable
CREATE TABLE "notes" (
    "note_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "folder_id" TEXT,
    "title" TEXT,
    "content" TEXT,
    "status" "NoteStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notes_pkey" PRIMARY KEY ("note_id")
);

-- CreateTable
CREATE TABLE "note_images" (
    "image_id" TEXT NOT NULL,
    "note_id" TEXT NOT NULL,
    "image_url" TEXT NOT NULL,
    "order_index" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "note_images_pkey" PRIMARY KEY ("image_id")
);

-- CreateTable
CREATE TABLE "extracted_entities" (
    "entity_id" TEXT NOT NULL,
    "note_id" TEXT NOT NULL,
    "type" "ExtractedEntityType" NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "extracted_entities_pkey" PRIMARY KEY ("entity_id")
);

-- CreateTable
CREATE TABLE "smart_actions" (
    "action_id" TEXT NOT NULL,
    "note_id" TEXT NOT NULL,
    "type" "ActionType" NOT NULL,
    "value" TEXT NOT NULL,
    "metadata" JSONB,

    CONSTRAINT "smart_actions_pkey" PRIMARY KEY ("action_id")
);

-- CreateTable
CREATE TABLE "batch_documents" (
    "batch_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "pdf_url" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "folder_id" TEXT,

    CONSTRAINT "batch_documents_pkey" PRIMARY KEY ("batch_id")
);

-- CreateTable
CREATE TABLE "search_histories" (
    "search_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "search_histories_pkey" PRIMARY KEY ("search_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "notes_user_id_status_idx" ON "notes"("user_id", "status");

-- AddForeignKey
ALTER TABLE "folders" ADD CONSTRAINT "folders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "folders"("folder_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "note_images" ADD CONSTRAINT "note_images_note_id_fkey" FOREIGN KEY ("note_id") REFERENCES "notes"("note_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "extracted_entities" ADD CONSTRAINT "extracted_entities_note_id_fkey" FOREIGN KEY ("note_id") REFERENCES "notes"("note_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "smart_actions" ADD CONSTRAINT "smart_actions_note_id_fkey" FOREIGN KEY ("note_id") REFERENCES "notes"("note_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch_documents" ADD CONSTRAINT "batch_documents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch_documents" ADD CONSTRAINT "batch_documents_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "folders"("folder_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "search_histories" ADD CONSTRAINT "search_histories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

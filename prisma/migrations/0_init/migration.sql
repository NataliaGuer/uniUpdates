-- CreateTable
CREATE TABLE `attendance` (
    `student` VARCHAR(100) NOT NULL,
    `course` INTEGER NOT NULL,

    INDEX `attendance_FK_1`(`course`),
    PRIMARY KEY (`student`, `course`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `course` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `building` VARCHAR(100) NOT NULL,
    `start_date` DATE NULL,
    `end_date` DATE NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lesson` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `course` INTEGER NOT NULL,
    `room` VARCHAR(50) NOT NULL,
    `weekdate` INTEGER NULL,
    `start_time` TIME(0) NULL,
    `end_time` TIME(0) NULL,

    INDEX `lesson_FK`(`course`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `teaching` (
    `professor` VARCHAR(100) NOT NULL,
    `course` INTEGER NOT NULL,

    INDEX `teaching_FK_1`(`course`),
    PRIMARY KEY (`professor`, `course`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `role` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sent_messages` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `to` VARCHAR(100) NOT NULL,
    `from` VARCHAR(100) NOT NULL,
    `text` VARCHAR(250) NOT NULL,
    `status` INTEGER NOT NULL DEFAULT 0,
    `sent_date` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `last_view_date` TIMESTAMP(0) NULL,

    INDEX `sent_messages_FK`(`from`),
    INDEX `sent_messages_FK_1`(`to`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user` (
    `email` VARCHAR(100) NOT NULL,
    `chat_id` INTEGER NULL,
    `role` INTEGER NULL,

    INDEX `user_FK`(`role`),
    PRIMARY KEY (`email`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `attendance` ADD CONSTRAINT `attendance_FK` FOREIGN KEY (`student`) REFERENCES `user`(`email`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `attendance` ADD CONSTRAINT `attendance_FK_1` FOREIGN KEY (`course`) REFERENCES `course`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `lesson` ADD CONSTRAINT `lesson_FK` FOREIGN KEY (`course`) REFERENCES `course`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `teaching` ADD CONSTRAINT `teaching_FK` FOREIGN KEY (`professor`) REFERENCES `user`(`email`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `teaching` ADD CONSTRAINT `teaching_FK_1` FOREIGN KEY (`course`) REFERENCES `course`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `sent_messages` ADD CONSTRAINT `sent_messages_FK` FOREIGN KEY (`from`) REFERENCES `user`(`email`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `sent_messages` ADD CONSTRAINT `sent_messages_FK_1` FOREIGN KEY (`to`) REFERENCES `user`(`email`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `user` ADD CONSTRAINT `user_FK` FOREIGN KEY (`role`) REFERENCES `role`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;


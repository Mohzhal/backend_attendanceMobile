-- phpMyAdmin SQL Dump
-- version 5.2.0
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Oct 14, 2025 at 04:34 AM
-- Server version: 8.0.30
-- PHP Version: 8.1.10

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `attendance-db`
--

DELIMITER $$
--
-- Functions
--
CREATE DEFINER=`root`@`localhost` FUNCTION `calculate_distance` (`lon1` DECIMAL(10,6), `lat1` DECIMAL(10,6), `lon2` DECIMAL(10,6), `lat2` DECIMAL(10,6)) RETURNS INT DETERMINISTIC BEGIN
  RETURN ROUND(
    ST_Distance_Sphere(
      ST_SRID(POINT(lon1, lat1), 4326),
      ST_SRID(POINT(lon2, lat2), 4326)
    )
  );
END$$

DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `attendance`
--

CREATE TABLE `attendance` (
  `id` bigint NOT NULL,
  `user_id` bigint NOT NULL,
  `company_id` bigint NOT NULL,
  `type` enum('checkin','checkout') NOT NULL,
  `photo_url` varchar(1000) DEFAULT NULL,
  `latitude` double DEFAULT NULL,
  `longitude` double DEFAULT NULL,
  `location` point NOT NULL
) ;

--
-- Dumping data for table `attendance`
--

INSERT INTO `attendance` (`id`, `user_id`, `company_id`, `type`, `photo_url`, `latitude`, `longitude`, `location`, `distance_m`, `is_valid`, `created_at`, `updated_at`) VALUES
(4, 9, 3, 'checkin', '/uploads/absensi/1760135699674-870180535.jpg', -6.4174877, 107.4009516, 0xe61000000101000000d951e630a9d95a40d5ed47e581ab19c0, 1, 1, '2025-10-10 22:35:00', '2025-10-10 22:35:00'),
(5, 10, 3, 'checkin', '/uploads/absensi/1760147791700-961013915.jpg', -6.3183517, 107.3796436, 0xe61000000101000000af88ab144cd85a400781f0fcfd4519c0, 11273, 0, '2025-10-11 01:56:32', '2025-10-11 01:56:32'),
(6, 10, 3, 'checkin', '/uploads/absensi/1760147791713-61605713.jpg', -6.3183517, 107.3796436, 0xe61000000101000000af88ab144cd85a400781f0fcfd4519c0, 11273, 0, '2025-10-11 01:56:32', '2025-10-11 01:56:32'),
(7, 9, 3, 'checkin', '/uploads/absensi/1760272163038-186549955.jpg', -6.4174872, 107.4009542, 0xe61000000101000000680cce3ba9d95a4094feb9c381ab19c0, 1, 1, '2025-10-12 12:29:23', '2025-10-12 12:29:23'),
(8, 9, 3, 'checkout', '/uploads/absensi/1760272350067-369331842.jpg', -6.4174876, 107.4009564, 0xe61000000101000000cd470845a9d95a402ff191de81ab19c0, 0, 1, '2025-10-12 12:32:33', '2025-10-12 12:32:33'),
(9, 9, 3, 'checkout', '/uploads/absensi/1760272349365-482988485.jpg', -6.4174876, 107.4009564, 0xe61000000101000000cd470845a9d95a402ff191de81ab19c0, 1, 1, '2025-10-12 12:32:33', '2025-10-12 12:32:34');

-- --------------------------------------------------------

--
-- Table structure for table `companies`
--

CREATE TABLE `companies` (
  `id` bigint NOT NULL,
  `name` varchar(255) NOT NULL,
  `address` text,
  `location` point NOT NULL
) ;

--
-- Dumping data for table `companies`
--

INSERT INTO `companies` (`id`, `name`, `address`, `location`, `valid_radius_m`, `created_at`, `updated_at`) VALUES
(3, 'PT Pindah berenang', 'Sumur bor ', 0xe61000000101000000f1aabd3ea9d95a407050b12083ab19c0, 100, '2025-10-10 21:47:34', '2025-10-10 21:47:34'),
(6, 'PT Agra mesa', 'Sukamaneh', 0xe610000001010000006ef5413b4cd85a403b996ec8f54519c0, 100, '2025-10-11 02:03:34', '2025-10-11 02:03:34');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` bigint NOT NULL,
  `name` varchar(255) NOT NULL,
  `birth_place` varchar(255) DEFAULT NULL,
  `birth_date` date DEFAULT NULL,
  `nik` varchar(20) NOT NULL,
  `gender` enum('L','P') DEFAULT NULL,
  `profile_photo_url` varchar(1000) DEFAULT NULL,
  `role` enum('super_admin','hr','karyawan') NOT NULL DEFAULT 'karyawan',
  `password` varchar(255) NOT NULL,
  `company_id` bigint DEFAULT NULL,
  `is_verified` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `name`, `birth_place`, `birth_date`, `nik`, `gender`, `profile_photo_url`, `role`, `password`, `company_id`, `is_verified`, `created_at`, `updated_at`) VALUES
(1, 'Admin LPK', NULL, NULL, '123456', NULL, NULL, 'super_admin', '$2b$10$Vpru2pUyCTLvSq4mzjOGQeXCHr7/qHpwSaNTrr.t8x5QUWzMTRb7W', NULL, 1, '2025-10-10 04:01:40', '2025-10-10 04:01:40'),
(8, 'Ade Ramli', NULL, NULL, '12345678', NULL, NULL, 'hr', '$2b$10$s4Ad8k5BxD76jsU.gqAjnuDXEsxvfRaQgczPPfLuqD498W.IeBa6m', 3, 1, '2025-10-10 21:47:35', '2025-10-10 21:47:35'),
(9, 'Muhammad Rizal', 'Karawang', '2004-02-18', '12345678910', 'L', 'http://192.168.1.4:5000/uploads/image/1760132905715-800685225-4b66c384-3d54-4b1c-b007-a3f28aa60bef.jpeg', 'karyawan', '$2b$10$qKNRv1bmU2/KSd5sytQfpeSBAbLOdoFy3riYSEg38ibAhc8AAFzva', 3, 1, '2025-10-10 21:48:26', '2025-10-13 10:20:17'),
(10, 'Balung', 'Karawang', '1999-12-01', '11111111', 'L', 'http://10.91.216.156:5000/uploads/image/1760147681693-834094681-b523a4e3-225b-40e7-bbda-3276acdbd4d0.jpeg', 'karyawan', '$2b$10$2xNYJvMwL/f6s9krqCcnDuOFoUdMXduZSCk8x8RrzW.a6I1lUaYPy', 3, 1, '2025-10-11 01:54:41', '2025-10-11 01:55:07'),
(13, 'Agra', 'Karawang', '1999-12-15', '33333333', 'L', 'http://10.91.216.156:5000/uploads/image/1760148074265-84342947-29f28673-5f69-4106-beb2-7a82de3fdb4f.jpeg', 'karyawan', '$2b$10$bcREDkSMDn4D8/SJdiac5ev6MHhfycyHYI/oVXO6Nihu0V1mc56Si', NULL, 1, '2025-10-11 02:01:14', '2025-10-14 02:37:00'),
(14, 'Asep', NULL, NULL, '1234567', NULL, 'http://10.91.216.156:5000/uploads/image/1760148214080-80344803-a9a00b9f-c811-43b6-8b87-c971f1e6af85.jpeg', 'hr', '$2b$10$8fUXgaGxADNGRSI0xow1/OI0sAjFWPuDtRumlB1chtJAYWIKy3YpS', 6, 1, '2025-10-11 02:03:34', '2025-10-11 02:03:34'),
(15, 'Agra Maesa', 'Sumenep', '1999-02-02', '12345', 'L', 'http://10.91.216.156:5000/uploads/image/1760148266145-539328759-0d01ee2b-c5df-4690-b898-8fc4253705fa.jpeg', 'karyawan', '$2b$10$2ygM/auUUUyZ0wPDmxlC9OOHJJlxUGtw7O5zgZeu/uNhcGWD5rXL2', 6, 1, '2025-10-11 02:04:26', '2025-10-11 02:05:30');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `nik` (`nik`),
  ADD KEY `idx_users_nik` (`nik`),
  ADD KEY `idx_users_company` (`company_id`),
  ADD KEY `idx_users_role` (`role`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `attendance`
--
ALTER TABLE `attendance`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `companies`
--
ALTER TABLE `companies`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `users`
--
ALTER TABLE `users`
  ADD CONSTRAINT `fk_users_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE SET NULL;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;

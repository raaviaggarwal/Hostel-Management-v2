-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Apr 17, 2024 at 07:23 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `hostel`
--

-- --------------------------------------------------------

--
-- Table structure for table `admin`
--

CREATE TABLE `admin` (
  `id` int(11) NOT NULL,
  `username` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(300) NOT NULL,
  `reg_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `updation_date` date NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Dumping data for table `admin`
--

INSERT INTO `admin` (`id`, `username`, `email`, `password`, `reg_date`, `updation_date`) VALUES
(1, 'admin', 'admin@gmail.com', 'Test@1234', '2024-01-31 20:31:45', '2024-02-10');

-- --------------------------------------------------------

--
-- Table structure for table `adminlog`
--

CREATE TABLE `adminlog` (
  `id` int(11) NOT NULL,
  `adminid` int(11) NOT NULL,
  `ip` varbinary(16) NOT NULL,
  `logintime` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `complainthistory`
--

CREATE TABLE `complainthistory` (
  `id` int(11) NOT NULL,
  `complaintid` int(11) DEFAULT NULL,
  `compalintStatus` varchar(255) DEFAULT NULL,
  `complaintRemark` mediumtext DEFAULT NULL,
  `postingDate` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `complainthistory`
--

INSERT INTO `complainthistory` (`id`, `complaintid`, `compalintStatus`, `complaintRemark`, `postingDate`) VALUES
(1, 1, 'In Process', 'We checking the issue.', '2024-04-07 17:32:30'),
(3, 1, 'Closed', 'The issue is fixed. Complaint solved', '2024-04-07 17:35:23'),
(4, 4, 'In Process', 'Plumber is assigned. visit your room soon\r\n', '2024-04-07 18:23:29'),
(5, 4, 'Closed', 'Plumbing issue is solved', '2024-04-07 18:23:54'),
(6, 5, 'In Process', 'Sorry for your inconvenience.', '2024-04-09 05:25:53'),
(7, 5, 'Closed', 'We take an action further this mistake is not repeated ', '2024-04-09 05:26:54'),
(8, 2, 'In Process', 'In-process', '2024-04-09 06:02:26'),
(9, 6, 'Closed', 'Test complaint\r\n', '2024-04-17 11:38:40'),
(10, 7, 'In Process', 'Electrrician is assigned', '2024-04-17 11:39:30'),
(11, 7, 'Closed', 'LED light changed', '2024-04-17 11:39:50');

-- --------------------------------------------------------

--
-- Table structure for table `complaints`
--

CREATE TABLE `complaints` (
  `id` int(11) NOT NULL,
  `ComplainNumber` bigint(12) DEFAULT NULL,
  `userId` int(11) DEFAULT NULL,
  `complaintType` varchar(255) DEFAULT NULL,
  `complaintDetails` mediumtext DEFAULT NULL,
  `complaintDoc` varchar(255) DEFAULT NULL,
  `complaintStatus` varchar(255) DEFAULT NULL,
  `registrationDate` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `complaints`
--

INSERT INTO `complaints` (`id`, `ComplainNumber`, `userId`, `complaintType`, `complaintDetails`, `complaintDoc`, `complaintStatus`, `registrationDate`) VALUES
(1, 473906789, 4, 'Electrical', 'This is for test purpose', 'bc0037e941ee50dbff488eef4c685f32.pdf', 'Closed', '2024-04-07 09:06:16'),
(2, 296166607, 4, 'Electrical', 'This is for test purpose', '684f9df8912bb035fa3f3a569f40d052.pdf', 'In Process', '2024-04-07 11:38:48'),
(3, 461558892, 4, 'Electrical', 'This is for test purpose', '769e3a6e21b74288480b14c2e6cf66dd.pdf', NULL, '2024-04-07 11:40:42'),
(4, 950749466, 3, 'Plumbing', 'Plumbing issue in my room', 'c7444a1c5a9e78424303236267882ebf.pdf', 'Closed', '2024-04-07 18:22:23'),
(5, 740539183, 5, 'Food Related', 'Food is not hygiene ', '6c77c0c0527914a8d295ce2c84bfc46f.jpg', 'Closed', '2024-04-09 05:19:17'),
(6, 100515426, 6, 'Food Related', 'Room not clean', 'ee2caeb05d35fcbe710b9d5d0f5ca1fc.pdf', 'Closed', '2024-04-17 11:37:26'),
(7, 316012785, 6, 'Electrical', 'Led Ligh not working', NULL, 'Closed', '2024-04-17 11:39:03');

-- --------------------------------------------------------

--
-- Table structure for table `courses`
--

CREATE TABLE `courses` (
  `id` int(11) NOT NULL,
  `course_code` varchar(255) DEFAULT NULL,
  `course_sn` varchar(255) DEFAULT NULL,
  `course_fn` varchar(255) DEFAULT NULL,
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Dumping data for table `courses`
--

INSERT INTO `courses` (`id`, `course_code`, `course_sn`, `course_fn`) VALUES
(1, 'B10992', 'B.Tech', 'Bachelor  of Technology'),
(2, 'M1453', 'M.Tech', 'Master  of Technology '),
(3, 'BT12', 'BT', 'Biotechnology in Bachelor of Technology'),
(4, 'BBA36356', 'BBA', 'Bachelor of Business Administration'),
(5, 'BI565', 'BI', 'Bioinformatics in Bachelor of Technology'),
(6, 'BE765', 'BE', 'Bachelor of Engineering');

-- --------------------------------------------------------

--
-- Table structure for table `feedback`
--

CREATE TABLE `feedback` (
  `id` int(11) NOT NULL,
  `AccessibilityWarden` varchar(255) DEFAULT NULL,
  `AccessibilityMember` varchar(255) DEFAULT NULL,
  `RedressalProblem` varchar(255) DEFAULT NULL,
  `Room` varchar(255) DEFAULT NULL,
  `Mess` varchar(255) DEFAULT NULL,
  `HostelSurroundings` varchar(255) DEFAULT NULL,
  `OverallRating` varchar(255) DEFAULT NULL,
  `FeedbackMessage` varchar(255) DEFAULT NULL,
  `userId` int(11) DEFAULT NULL,
  `postinDate` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `feedback`
--

INSERT INTO `feedback` (`id`, `AccessibilityWarden`, `AccessibilityMember`, `RedressalProblem`, `Room`, `Mess`, `HostelSurroundings`, `OverallRating`, `FeedbackMessage`, `userId`, `postinDate`) VALUES
(1, 'Excellent', 'Very Good', 'Good', 'Average', 'Below Average', 'Excellent', 'Very Good', 'This is for testing purpose', 4, '2024-04-07 16:02:03'),
(2, 'Excellent', 'Excellent', 'Very Good', 'Average', 'Average', 'Average', 'Average', 'NA', 3, '2024-04-07 18:25:12'),
(3, 'Good', 'Very Good', 'Excellent', 'Very Good', 'Good', 'Very Good', 'Very Good', 'Nice Hostel', 5, '2024-04-09 05:30:43'),
(4, 'Very Good', 'Excellent', 'Very Good', 'Excellent', 'Excellent', 'Excellent', 'Excellent', 'Hostel is very good', 6, '2024-04-17 11:40:25');

-- --------------------------------------------------------

--
-- Table structure for table `registration`
--

CREATE TABLE `registration` (
  `id` int(11) NOT NULL,
  `roomno` varchar(50) DEFAULT NULL,
  `seater` int(11) DEFAULT NULL,
  `year` varchar(50) DEFAULT NULL,
  `course` varchar(500) DEFAULT NULL,
  `regno` bigint(11) DEFAULT NULL,
  `firstName` varchar(500) DEFAULT NULL,
  `lastName` varchar(500) DEFAULT NULL,
  `gender` varchar(250) DEFAULT NULL,
  `contactno` bigint(11) DEFAULT NULL,
  `emailid` varchar(500) DEFAULT NULL,
  `guardianName` varchar(500) DEFAULT NULL,
  `guardianRelation` varchar(500) DEFAULT NULL,
  `guardianContactno` bigint(11) DEFAULT NULL,
  `corresAddress` varchar(500) DEFAULT NULL,
  `corresCIty` varchar(500) DEFAULT NULL,
  `corresState` varchar(500) DEFAULT NULL,
  `corresPincode` int(11) DEFAULT NULL,
  `pmntAddress` varchar(500) DEFAULT NULL,
  `pmntCity` varchar(500) DEFAULT NULL,
  `pmnatetState` varchar(500) DEFAULT NULL,
  `pmntPincode` int(11) DEFAULT NULL,
  `postingDate` timestamp NULL DEFAULT current_timestamp(),
  `updationDate` varchar(500) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Dumping data for table `registration`
--

INSERT INTO `registration` (`id`, `roomno`, `seater`, `feespm`, `year`, `course`, `regno`, `firstName`, `lastName`, `gender`, `contactno`, `emailid`, `guardianName`, `guardianRelation`, `guardianContactno`, `corresAddress`, `corresCIty`, `corresState`, `corresPincode`, `pmntAddress`, `pmntCity`, `pmnatetState`, `pmntPincode`, `postingDate`, `updationDate`) VALUES
(2, 'B-2', 2, 80000, '2yr', 'Bachelor  of Technology', 231031009, 'Raavi ', ' Aggarwal', 'Female', 1234567890, 'raavi@juitsolan.in', 'Mr. ABC', 'XYZ', 98756320000, 'ABC 12345 XYZ Street', 'New Delhi', 'Delhi (NCT)', 110001, 'ABC 12345 XYZ Street', 'New Delhi', 'Delhi (NCT)', 110001, '2024-03-05 ', NULL),
(3, 'B-4', 1, 87000, '2yr', 'Bachelor  of Science', 231030106, 'Nivi ', ' Jha', 'Female', 1425362514, 'nivi@juitsolan.in',  'Mr. XYZ', 'father', 1234567890, '123 Xyz apartment ', 'New Delhi', 'Delhi (NCT)', 110001, '123 Xyz apartment ', 'New Delhi', 'Delhi (NCT)', 110001, '2024-03-14 ', NULL),
(4, 'B-13', 2, 80000,'2yr', 'Bachelor Of commerce ',  231030117,'Darshika ', ' Tyagi', 'Female', 1234567890, 'darshika@juitsolan.in',  'Mr. YZX', 'yrtyrty', 46456456, 'ttyrytryr', 'yrty', 'Andhra Pradesh', 123123, 'ttyrytryr', 'yrty', 'Andhra Pradesh', 123123, '2024-04-07 ', NULL),
(5, 'A-11', 3, 80000, '2yr', 'Bachelor  of Technology', 231030108, 'Aarya ', ' Gupta ', 'Female', 8956237845, 'aarya@juitsolan.in',  'Mr. PQS', 'Uncle', 5623894178, 'H-899, Gauri Apartment', 'Kanpur', 'Uttar Pradesh', 551007, 'H-899, Gauri Apartment', 'Kanpur', 'Uttar Pradesh', 551007, '2024-04-09 ', NULL),
(6, 'D-34', 2, 80000, '2yr', 'Bachelor  of Technology', 231030113, 'Anvesha ', ' Vijan', 'Female', 9632587412, 'avesha@juitsolan,in',  'Mr. Ram Kumar Singh', 'Father', 4563245631, 'Hno 181/1 Mayur Vihar ', 'New Delhi', 'Delhi (NCT)', 110092, 'Hno 181/1 Mayur Vihar ', 'New Delhi', 'Delhi (NCT)', 110092, '2024-04-17 ', NULL);
-- --------------------------------------------------------

--
-- Table structure for table `rooms`
--

CREATE TABLE `rooms` (
  `id` int(11) NOT NULL,
  `seater` int(11) DEFAULT NULL,
  `room_no` varchar(100) DEFAULT NULL,
  `fees` int(11) DEFAULT NULL,
  `posting_date` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Dumping data for table `rooms`
--

INSERT INTO `rooms` (`id`, `seater`, `room_no`, `fees`, `posting_date`) VALUES
(1, 1, 'B-1', 87000, '2024-02-19 22:45:43'),
(2, 2, 'B-2', 80000, '2024-02-19 22:45:43'),
(3, 2, 'B-3', 80000, '2024-02-19 22:45:43'),
(4, 2, 'B-4', 80000, '2024-02-19 22:45:43'),
(5, 2, 'B-5', 80000, '2024-02-19 22:45:43'),
(6, 1, 'B-6', 8000, '2024-04-17 11:41:16');

-- --------------------------------------------------------

--
-- Table structure for table `states`
--

CREATE TABLE `states` (
  `id` int(11) NOT NULL,
  `State` varchar(150) DEFAULT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Dumping data for table `states`
--

INSERT INTO `states` (`id`, `State`) VALUES
(1, 'Andaman and Nicobar Island (UT)'),
(2, 'Andhra Pradesh'),
(3, 'Arunachal Pradesh'),
(4, 'Assam'),
(5, 'Bihar'),
(6, 'Chandigarh (UT)'),
(7, 'Chhattisgarh'),
(8, 'Dadra and Nagar Haveli (UT)'),
(9, 'Daman and Diu (UT)'),
(10, 'Delhi (NCT)'),
(11, 'Goa'),
(12, 'Gujarat'),
(13, 'Haryana'),
(14, 'Himachal Pradesh'),
(15, 'Jammu and Kashmir'),
(16, 'Jharkhand'),
(17, 'Karnataka'),
(18, 'Kerala'),
(19, 'Lakshadweep (UT)'),
(20, 'Madhya Pradesh'),
(21, 'Maharashtra'),
(22, 'Manipur'),
(23, 'Meghalaya'),
(24, 'Mizoram'),
(25, 'Nagaland'),
(26, 'Odisha'),
(27, 'Puducherry (UT)'),
(28, 'Punjab'),
(29, 'Rajastha'),
(30, 'Sikkim'),
(31, 'Tamil Nadu'),
(32, 'Telangana'),
(33, 'Tripura'),
(34, 'Uttarakhand'),
(35, 'Uttar Pradesh'),
(36, 'West Bengal');

-- --------------------------------------------------------

-- --------------------------------------------------------

--
-- Table structure for table `userregistration`
--

CREATE TABLE `userregistration` (
  `id` int(11) NOT NULL,
  `regNo` varchar(255) DEFAULT NULL,
  `firstName` varchar(255) DEFAULT NULL,
  `lastName` varchar(255) DEFAULT NULL,
  `gender` varchar(255) DEFAULT NULL,
  `contactNo` bigint(20) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  `regDate` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Dumping data for table `userregistration`
--

INSERT INTO `userregistration` (`id`, `regNo`, `firstName`, `lastName`, `contactNo`, `email`, `password`, `regDate`) VALUES
(3, '231031009', 'Raavi', 'Aggarwal', 1234567890, 'raavi@gmail.com', '123', '2023-07-01'),
(4, '221030106', 'Nivi', 'Jha', 1425362514, 'nivi@gmail.com', '123', '2023-07-14'),
(5, '231030117', 'Darshika','Tyagi ', 8956237845, 'darshika@gmail.com', '123', '2023-07-09'),
(6, '231030108', 'Aarya','Gupta ', 8956237845, 'aarya@gmail.com', '123', '2023-07-09'),
(7, '231030113', 'Anvesha', 'Vijan', 9632587412, 'anvesha@gmail.com', '123', '2023-07-17');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `admin`
--
ALTER TABLE `admin`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `complainthistory`
--
ALTER TABLE `complainthistory`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `complaints`
--
ALTER TABLE `complaints`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `courses`
--
ALTER TABLE `courses`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `feedback`
--
ALTER TABLE `feedback`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `registration`
--
ALTER TABLE `registration`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `rooms`
--
ALTER TABLE `rooms`
  ADD PRIMARY KEY (`id`),
  ADD KEY `room_no` (`room_no`);

--
-- Indexes for table `states`
--
ALTER TABLE `states`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `userlog`
--
ALTER TABLE `userlog`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `userregistration`
--
ALTER TABLE `userregistration`
  ADD PRIMARY KEY (`id`),
  ADD KEY `email` (`email`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `admin`
--
ALTER TABLE `admin`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `complainthistory`
--
ALTER TABLE `complainthistory`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT for table `complaints`
--
ALTER TABLE `complaints`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `courses`
--
ALTER TABLE `courses`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `feedback`
--
ALTER TABLE `feedback`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `registration`
--
ALTER TABLE `registration`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `rooms`
--
ALTER TABLE `rooms`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `states`
--
ALTER TABLE `states`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=37;

--
-- AUTO_INCREMENT for table `userlog`
--
ALTER TABLE `userlog`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `userregistration`
--
ALTER TABLE `userregistration`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;
  
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;

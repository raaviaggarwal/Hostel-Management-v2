<?php
session_start();
include('includes/config.php');
include('includes/checklogin.php');
check_login();

?>
<!doctype html>
<html lang="en" class="no-js">

<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1">
    <meta name="description" content="">
    <meta name="author" content="">
    <meta name="theme-color" content="#3e454c">
    <title>Feedback Page</title>
    <link rel="stylesheet" href="css/font-awesome.min.css">
    <link rel="stylesheet" href="css/bootstrap.min.css">
    <link rel="stylesheet" href="css/dataTables.bootstrap.min.css">
    <link rel="stylesheet" href="css/style.css">
    <link href="https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;700&display=swap" rel="stylesheet">
    <style>
        .btn {
            font-family: 'Source Sans 3', sans-serif;
        }
    </style>
</head>

<body>
    <?php include('includes/header.php'); ?>
    <div class="ts-main-content">
        <?php include('includes/sidebar.php'); ?>
        <div class="content-wrapper">
            <div class="container-fluid">
                <div class="row">
                    <div class="col-md-12">
                        <h2 class="page-title" style="margin-top:5%">Feedback Details</h2>
                        <div class="panel panel-default">
                            <div class="panel-heading">All Feedback Entries</div>
                            <div class="panel-body">
                                <table id="zctb" class="display table table-striped table-bordered table-hover" cellspacing="0" width="100%">
                                    <thead>
                                        <tr>
                                            <th>S.No.</th>
                                            <th>Accessibility to Warden</th>
                                            <th>Accessibility to Members</th>
                                            <th>Redressal of Problems</th>
                                            <th>Room Condition</th>
                                            <th>Mess Condition</th>
                                            <th>Hostel Surroundings</th>
                                            <th>Overall Rating</th>
                                            <th>Feedback Message</th>
                                            <th>Feedback Date</th>
                                        </tr>
                                    </thead>
                                    <tfoot>
                                        <tr>
                                            <th>S.No.</th>
                                            <th>Accessibility to Warden</th>
                                            <th>Accessibility to Members</th>
                                            <th>Redressal of Problems</th>
                                            <th>Room Condition</th>
                                            <th>Mess Condition</th>
                                            <th>Hostel Surroundings</th>
                                            <th>Overall Rating</th>
                                            <th>Feedback Message</th>
                                            <th>Feedback Date</th>
                                        </tr>
                                    </tfoot>
                                    <tbody>
                                        <?php
                                        $ret = "SELECT * FROM feedback";
                                        $stmt = $mysqli->prepare($ret);
                                        $stmt->execute();
                                        $res = $stmt->get_result();
                                        $cnt = 1;
                                        while ($row = $res->fetch_object()) {
                                        ?>
                                            <tr>
                                                <td><?php echo $cnt; ?></td>
                                                <td><?php echo $row->AccessibilityWarden; ?></td>
                                                <td><?php echo $row->AccessibilityMember; ?></td>
                                                <td><?php echo $row->RedressalProblem; ?></td>
                                                <td><?php echo $row->Room; ?></td>
                                                <td><?php echo $row->Mess; ?></td>
                                                <td><?php echo $row->HostelSurroundings; ?></td>
                                                <td><?php echo $row->OverallRating; ?></td>
                                                <td><?php echo $row->FeedbackMessage; ?></td>
                                                <td><?php echo $row->postinDate; ?></td>
                                            </tr>
                                        <?php
                                            $cnt++;
                                        }
                                        ?>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Loading Scripts -->
    <script src="js/jquery.min.js"></script>
    <script src="js/bootstrap-select.min.js"></script>
    <script src="js/bootstrap.min.js"></script>
    <script src="js/jquery.dataTables.min.js"></script>
    <script src="js/dataTables.bootstrap.min.js"></script>
    <script src="js/main.js"></script>
</body>

</html>

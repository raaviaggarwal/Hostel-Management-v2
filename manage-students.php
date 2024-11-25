<?php
session_start();
include('includes/config.php');
include('includes/checklogin.php');
check_login();

// Delete Record Logic
// Delete Record Logic
if (isset($_GET['del'])) {
    $id = intval($_GET['del']);  // Get the 'del' parameter from URL

    // Prepare and execute delete query for registration table
    $adn1 = "DELETE FROM registration WHERE regno = ?";
    $adn2 = "DELETE FROM userregistration WHERE regno = ?";
    
    // Start a transaction to ensure both deletions are done atomically
    $mysqli->begin_transaction();

    try {
        // Delete from registration table
        if ($stmt1 = $mysqli->prepare($adn1)) {
            $stmt1->bind_param('i', $id);  // Bind the regno parameter as integer
            $stmt1->execute();  // Execute the query
            $stmt1->close();
        } else {
            throw new Exception("Error deleting from registration table: " . $mysqli->error);
        }

        // Delete from userregistration table
        if ($stmt2 = $mysqli->prepare($adn2)) {
            $stmt2->bind_param('i', $id);  // Bind the regno parameter as integer
            $stmt2->execute();  // Execute the query
            $stmt2->close();
        } else {
            throw new Exception("Error deleting from userregistration table: " . $mysqli->error);
        }

        // Commit the transaction if both deletions are successful
        $mysqli->commit();

        // Redirect to the same page to refresh the list of students
        header("Location: manage-students.php");  // Reload the page after deletion
        exit;  // Make sure the script stops here after redirecting
    } catch (Exception $e) {
        // If an error occurs, roll back the transaction and display an error message
        $mysqli->rollback();
        echo "Error deleting record: " . $e->getMessage();
    }

    // Redirect to the same page to refresh the list of students
    header("Location: manage-students.php");  // Reload the page after deletion
    exit;  // Make sure the script stops here after redirecting
}
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
    <title>Manage Rooms</title>
    <link rel="stylesheet" href="css/font-awesome.min.css">
    <link rel="stylesheet" href="css/bootstrap.min.css">
    <link rel="stylesheet" href="css/dataTables.bootstrap.min.css">
    <link rel="stylesheet" href="css/bootstrap-social.css">
    <link rel="stylesheet" href="css/bootstrap-select.css">
    <link rel="stylesheet" href="css/fileinput.min.css">
    <link rel="stylesheet" href="css/awesome-bootstrap-checkbox.css">
    <link rel="stylesheet" href="css/style.css">

    <link href="https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;700&display=swap" rel="stylesheet">
    <style>
        .btn {
            font-family: 'Source Sans 3', sans-serif;
        }
    </style>

    <script language="javascript" type="text/javascript">
    var popUpWin=0;
    function popUpWindow(URLStr, left, top, width, height)
    {
        if(popUpWin)
        {
            if(!popUpWin.closed) popUpWin.close();
        }
        popUpWin = open(URLStr,'popUpWin', 'toolbar=no,location=no,directories=no,status=no,menubar=no,scrollbars=yes,resizable=no,copyhistory=yes,width='+510+',height='+430+',left='+left+', top='+top+',screenX='+left+',screenY='+top+'');
    }
    </script>

</head>

<body>
    <?php include('includes/header.php');?>

    <div class="ts-main-content">
        <?php include('includes/sidebar.php');?>
        <div class="content-wrapper">
            <div class="container-fluid">
                <div class="row">
                    <div class="col-md-12">
                        <h2 class="page-title" style="margin-top:5%">Manage Registered Students</h2>
                        <div class="panel panel-default">
                            <div class="panel-heading">All Room Details</div>
                            <div class="panel-body">
                                <table id="zctb" class="display table table-striped table-bordered table-hover" cellspacing="0" width="100%">
                                    <thead>
                                        <tr>
                                            <th>Sno.</th>
                                            <th>Student Name</th>
                                            <th>Reg no</th>
                                            <th>Contact no </th>
                                            <th>Room no  </th>
                                            <th>Seater </th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tfoot>
                                        <tr>
                                            <th>Sno.</th>
                                            <th>Student Name</th>
                                            <th>Reg no</th>
                                            <th>Contact no </th>
                                            <th>Room no  </th>
                                            <th>Seater </th>
                                            <th>Action</th>
                                        </tr>
                                    </tfoot>
                                    <tbody>
<?php    
$aid = $_SESSION['id'];  // Session ID
$ret = "SELECT * FROM registration";  // SQL query to fetch all registration data
$stmt = $mysqli->prepare($ret);
$stmt->execute();  // Execute the query
$res = $stmt->get_result();
$cnt = 1;

while ($row = $res->fetch_object()) {
?>
<tr>
    <td><?php echo $cnt; ?></td>
    <td><?php echo $row->firstName; ?> <?php echo $row->lastName; ?></td>
    <td><?php echo $row->regno; ?></td>
    <td><?php echo $row->contactno; ?></td>
    <td><?php echo $row->roomno; ?></td>
    <td><?php echo $row->seater; ?></td>
    <td>
        <a href="student-details.php?regno=<?php echo $row->regno; ?>" title="View Full Details">
            <i class="fa fa-desktop"></i>
        </a>&nbsp;&nbsp;
        <a href="manage-students.php?del=<?php echo $row->regno; ?>" title="Delete Record" onclick="return confirm('Do you want to delete?');">
            <i class="fa fa-close"></i>
        </a>
    </td>
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
    <script src="js/Chart.min.js"></script>
    <script src="js/fileinput.js"></script>
    <script src="js/chartData.js"></script>
    <script src="js/main.js"></script>

</body>

</html>

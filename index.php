<?php
session_start();
include('includes/config.php');
if(isset($_POST['login']))
{
$username=$_POST['username'];
$password=$_POST['password'];
$stmt=$mysqli->prepare("SELECT username,email,password,id FROM admin WHERE (userName=?|| email=?) and password=? ");
				$stmt->bind_param('sss',$username,$username,$password);
				$stmt->execute();
				$stmt -> bind_result($username,$username,$password,$id);
				$rs=$stmt->fetch();
				$_SESSION['id']=$id;
				$uip=$_SERVER['REMOTE_ADDR'];
				$ldate=date('d/m/Y h:i:s', time());
				if($rs)
				{
                //  $insert="INSERT into admin(adminid,ip)VALUES(?,?)";
   // $stmtins = $mysqli->prepare($insert);
   // $stmtins->bind_param('sH',$id,$uip);
    //$res=$stmtins->execute();
					header("location:dashboard.php");
				}

				else
				{
					echo "<script>alert('Invalid Username/Email or password');</script>";
				}
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

	<title>Admin login</title>

	<link href="https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;600;700&display=swap" rel="stylesheet">
	<link rel="stylesheet" href="css/font-awesome.min.css">
	<link rel="stylesheet" href="css/bootstrap.min.css">
	<link rel="stylesheet" href="css/dataTables.bootstrap.min.css">
	<link rel="stylesheet" href="css/bootstrap-social.css">
	<link rel="stylesheet" href="css/bootstrap-select.css">
	<link rel="stylesheet" href="css/fileinput.min.css">
	<link rel="stylesheet" href="css/awesome-bootstrap-checkbox.css">
	<link rel="stylesheet" href="css/style.css">

	<style>
        body {
            font-family: 'Source Sans 3', sans-serif;
        }

        .form-content form input,
        .form-content form label,
        .form-content h1 {
            font-family: 'Source Sans 3', sans-serif;
        }
		.btn-primary {
            background-color: #04335C;
            border-color: #04335C;
        }

        .btn-primary:hover {
            background-color: #021F3A;
            border-color: #021F3A;
        } 
    </style>
</head>

<body>
	
	<div class="login-page bk-img" style="background-image: url(img/hostel2.webp);">
		<div class="form-content">
			<div class="container">
				<div class="row">
					<div class="col-md-6 col-md-offset-3" style="margin-top:4%">
					<h1 class="text-center text-bold text-light mt-4x" style="font-size: 3em;">Hostel Management System</h1>
						<div class="well row pt-4x pb-4x bk-light">
							<div class="col-md-10 col-md-offset-1">
								<form action="" class="mt-2" method="post" style="font-size: 1.2em;">
									<label for="username" class="text-uppercase text-sm" style="margin-top: 0;">Your Username or Email</label>
									<input 
										type="text" 
										id="username" 
										placeholder="Username" 
										name="username" 
										class="form-control mb" 
										style="height: 50px; font-size: 1.2em;"
									>
									<label for="password" class="text-uppercase text-sm" style="margin-top: 0.5em;">Password</label>
									<input 
										type="password" 
										id="password" 
										placeholder="Password" 
										name="password" 
										class="form-control mb" 
										style="height: 50px; font-size: 1.2em;"
									>
									<input 
										type="submit" 
										name="login" 
										class="btn btn-primary btn-block" 
										value="Login" 
										style="height: 60px; font-size: 1.5em;"
									>
								</form>

							</div>
						</div>

					</div>
				</div>
			</div>
		</div>
	</div>
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
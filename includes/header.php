<style>
  .brand {
    background-color: #04335C; /* Header bar background color */
    color: #fff; /* Ensure text is white for readability */
    padding: 10px 20px; /* Add some padding for better spacing */
  }

  .brand .logo {
    color: #fff; /* Logo text color */
    text-decoration: none; /* Remove underline from the logo link */
  }

  .brand .menu-btn i {
    color: #032949; /* Menu icon color */
  }

  .ts-profile-nav li a {
    color: #032949; /* Account links color */
    text-decoration: none; /* Remove underline from links */
  }

  .ts-profile-nav li a:hover {
    color: #ddd; /* Lighter color for hover effect */
  }

  .ts-profile-nav ul {
	background-color: #04335C; /* Same color as the header bar */
	border: none; /* Remove any border */
	list-style: none; /* Remove bullet points */
	padding: 0;
	margin: 0;
	border-radius: 5px; /* Optional: Add rounded corners */
  }

  .ts-profile-nav ul li a {
	color: #032949; /* White text color */
	display: block;
	padding: 10px 15px; /* Add some padding for better spacing */
	text-decoration: none; /* Remove underline */
  }

  .ts-profile-nav ul li a:hover {
  	background-color: #03527B; /* Optional: Slightly lighter shade for hover effect */
  } 
  
  
</style>


<div class="brand clearfix">
	<a href="#" class="logo" style="font-size:28px; color:#fff; white-space: nowrap;">Hostel Management System</a>
	<span class="menu-btn"><i class="fa fa-bars"></i></span>
	<ul class="ts-profile-nav">
		<li class="ts-account">
			<a href="#" style="background-color: #03527B"><img src="img/profilepic2.webp" class="ts-avatar hidden-side" alt=""> Account <i class="fa fa-angle-down hidden-side" style="background-color: #03527B"></i></a>
			<ul>
				<li><a href="admin-profile.php" style="background-color: #03527B">My Account</a></li>
				<li><a href="logout.php" style="background-color: #03527B">Logout</a></li>
			</ul>
		</li>
	</ul>
</div>

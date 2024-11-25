<style>
  .ts-sidebar {
    background-color: #05447a; /* Sidebar background */
    width: 270px; /* Increased sidebar width */
  }

  .ts-sidebar-menu {
    color: #fff; /* Sidebar menu text color */
  }

  .ts-sidebar-menu li i {
    color: #ffffff;
    margin-right: 10px; /* Space between icon and text */
    font-size: 1.3em; /* Increase icon size */
  }

  .ts-sidebar-menu li a {
    color: #fff; /* Link text color */
    text-decoration: none; /* Remove underline */
    font-size: 1.3em; /* Increase font size for the main items */
    padding: 12px 20px; /* Add more padding for better spacing */
    display: block; /* Make the entire area clickable */
  }

  .ts-sidebar-menu li a:hover {
    color: #ddd; /* Lighter color for hover effect */
    text-decoration: none; /* Keep underline removed on hover */
    background-color: #06476F; /* Darker background on hover */
  }

  .ts-sidebar-menu .ts-label {
    text-align: left; /* Left align the text */
    margin-top: 40px; /* Add more top margin */
    font-weight: bold; /* Bold font */
    font-size: 1.4em; /* Larger label font size */
    color: #fff; /* Ensure the text color is white for better visibility */
  }

  .ts-sidebar-menu li ul li a {
    color: #ddd; /* Submenu links color */
    font-size: 1.2em; /* Slightly larger font for submenu items */
    padding-left: 30px; /* Indent submenu links */
  }

  .ts-sidebar-menu li ul li a:hover {
    color: #fff; /* White text on hover */
    background-color: #06476F; /* Subtle hover background for submenu */
  }

  /* Larger font size for specific menu items */
  .ts-sidebar-menu li a {
    font-size: 1.3em; /* Make Feedback, Complaints, Manage Students bigger */
    /* font-weight: bold; Bold text */
  }

  /* Adjust font size for submenu items */
  .ts-sidebar-menu li ul li a {
    font-size: 1.2em; /* Larger font size for submenu items */
  }

  /* Ensure the submenu is properly aligned */
  .ts-sidebar-menu li ul {
    padding-left: 20px; /* Indent submenu items */
  }
</style>



<nav class="ts-sidebar">
  <ul class="ts-sidebar-menu">
    <li class="ts-label">Main</li>
    <li><a href="dashboard.php"><i class="fa fa-dashboard"></i> Dashboard</a></li>
    <li>
      <a href="#"><i class="fa fa-files-o"></i> Courses</a>
      <ul>
        <li><a href="add-courses.php">Add Courses</a></li>
        <li><a href="manage-courses.php">Manage Courses</a></li>
      </ul>
    </li>
    <li>
      <a href="#"><i class="fa fa-desktop"></i> Rooms</a>
      <ul>
        <li><a href="create-room.php">Add a Room</a></li>
        <li><a href="manage-rooms.php">Manage Rooms</a></li>
      </ul>
    </li>
    <li><a href="registration.php"><i class="fa fa-user"></i>Student Registration</a></li>
    <li><a href="manage-students.php"><i class="fa fa-users"></i>Manage Students</a></li>
    <li>
      <a href="#"><i class="fa fa-files-o"></i> Complaints</a>
      <ul>
        <li><a href="new-complaints.php">New</a></li>
        <li><a href="inprocess-complaints.php">In Process</a></li>
        <li><a href="closed-complaints.php">Closed</a></li>
        <li><a href="all-complaints.php">All</a></li>
      </ul>
    </li>
    <li>
      <a href="#"><i class="fa fa-desktop"></i> Feedback</a>
      <ul>
        <li><a href="feedbacks.php">All Feedbacks</a></li>
      </ul>
    </li>
  </ul>
</nav>

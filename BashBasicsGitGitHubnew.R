# BASIC BASH / Pushing a file to GitHub

# Git ->  coding and processing      GitHub -> Posting , Showing, Hosting

# Open up the terminal in R Studio

# The Command Line
#   The command line is like the R command prompt: you insert code, hit
#   enter, and then the computer executes your command.

#   However, instead of inserting R code, you insert what is called
#   shell script (bash scripting language)

#   In this class, we will use the command line primarily for two 
#   things:
#      - Moving around in your file system
#      - Running git commands. (git is a version control system that
#        will be explored in more detail later)
#   Other words for command line are : shell, terminal, command line 
#   interface, and console (They all essentially mean the same thing)

# A huge difference between R and bash is how commands/functions are
# called.
#      - R:   for R, we use parentheses and commas
#      - Bash: for Bash, no commas and no parentheses
# Arguments that are 'flags' require only one dash, like f x -g would
# incorporate the g flag

# If you are using Windows, you need to first download and install git
# For a Mac, git is probably embedded (you already have it)

# To open the terminal, simply open the R Studio and do the following:
# Go to tools (At the top of the screen), then scroll down to Terminal,
# and then go to New Terminal.
# You now start entering code after the dollar sign.
# Working Directory designation for R differs from the terminal.
# To find your working directory for R, go to the console and type in
# getwd()
# To find your working directory for the terminal you can enter the 
# bash script, pwd (print working directory)

# Useful Commands:
# pwd (print working directory)

# ls  (print files, folders and directories in the current directory)

# cd  (change the working directory)  (Use this command with care)
# Let's change my working directory to a Folder, FolderA
# cd ~/Desktop/FolderA

# man <command>  (provides all arguments associated with the stated
# command)  Use this command if not using windows

# <command> --help (provides arguments, flags and explanations 
# related to the  command indicated)

# Example : What does the command "head" do ?
# head --help

# touch  (creates an empty file)  example:  touch  emptyfile 
# (go to the Directory location and look for the file)

# # rm (removes a file)  Lets remove the empty file that you
# just created     rm emptyfile


# cp makes (a copy of a file)  (cp  file  destination)

# mv (renames a file)  (mv currentfilename newfilename)
# Lets change the name of a Folder on my desktop
# Go to your desktop and create a Folder and call it FolderZ

# mv FolderZ FolderZZ


# mkdir (Creates a directory)
#   make a directory called Folder2  (mkdir Folder22)  
#   mkdir ~/Desktop/Folder22

#   now change directory to Folder2  (cd Folder2)   
#   cd ~/Desktop/Folder2

#    now change back to the original directory  
#   cd ~/Desktop

#    confirm that you are now using the original directory  (pwd)

# GIT and GITHUB

# GIT is a Version Control System
# What is a Version Control System?
#   A Version Control System is a program that tracks changes to 
#    specified files over a period of time and maintains a library
#   of all past versions of those files

# GITHUB is a website that hosts git repositories. 
#    A repository is a storage location for data and files. 
#    A Git repository is the . git/ folder inside a project. 
#    This repository tracks all changes made to files in your project,
#    building a history over time.

# We will now practice managing and modifying files, using Git through
# the bash commands of the terminal and then moving (pushing) a file to
# Github

# Step 1 Create a new repository on Git hub  (github.com)
# Step 2 Open Git Bash
# Step 3 Check to make sure that the location of your file matches your 
#        working directory
# Step 4 Initialize the local directory as a Git repository 
#        enter the code statement   git init
# Step 5 git status  (Identify the file that you would like to move/push to
#        Github)
# Step 6 ls  (you are now looking at specific files that you can push to Github)
# Step 7 git add (Add the files in your new local repository. This stages it for
# the first commit.)
# Step 8 Commit the files that you've staged in your local repository.
#        enter the command:  git commit -m "type a message"
# Step 9 At the top of your GitHub repository's Quick Setup page, click to copy 
# the remote repository URL. 

# Step 10 Enter:  git remote add <some nickname> <the copied URL>
#        (this will set the new remote)
# Step 11 Enter: git remote -v  (this will verify the new remote URL) 
# Step 12  Enter:  git push -u <nickname> master (this code will push the file
# to Github)
# Step 13 Go to Github and locate your file






q()
y
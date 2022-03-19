library(tidyverse)
library(dplyr)

# Homework 1

# 1
# Write a function that will find the sum of the natural log, the common log and a 
# log of base 2 for any given positive number.
# Use your function to find answers for the first five even integers.  Show all
# details and structure of your function.  You should get five answers. The first two 
# answers are 1.994177 and 3.988354. (Your output should show the other three)


sp <- function(n) {
  (log(n) + log10(n) + log2(n))
  
}

sp(2*(1:5))

# 2 Use the if - else structure to print the statement "This is a big number" if the
# square of a value is greater than or equal to 100 and the following statement is
# printed if the square of the number is less than 100, "This is not a big number"
# Use and show values of assignment and if-else structures that will output both
# statements.


x <- 4  
if(x^2 >= 100){
  print("This is a big number")
} else {
  print("This is not a big number")
}
#3  For the following if-else-if coding structure, make an adjustment so that it 
# prints "Team A won"

team_A <- 2 # Number of goals scored by Team A
team_B <- 2# Number of goals scored by Team B

if (team_A > team_B){
  print ("Team A won")
} else if (team_A < team_B){
  print ("Team B won")
} else {
  "Team A & B tied"
}


#4 Write an if else if else sequence of commands that will output the following
# statements and appropriate output; If a value is divisible by 3 and 5 the output
# statement is "divisible by Three and Five", If a value is divisible by 3 and 4, 
# the output statement is "divisible by Three and Four, If a value is a number that
# does not fall into either category, the output statement should be  "neither".
# Use your function to show output statements for values 16, 45, and 24.


x<- 30
if (x%%4 == 0 & x%%3  == 0){
  print ("Divisible by Four and Three")
} else if (x%%3 == 0 & x%%5  == 0) {
  print ("Divisible by Three and Five") 
  
} else{
  "neither"
}


# 4 Construct a for loop (as illustrated in the notes) that will produce the 
# difference between the cube and the square for each prime number between 
# 10 and 30.  (There are 6 answers. The first answer is 1210, your for loop
# coding should produce the other five answers)

for (i in c(11,13,17,19,23,29)){
  print(i^3-i^2)
}

mpg



output2 <- vector("double", ncol(mtcars))  # 1. output
for (i in seq_along(mtcars)) {            # 2. sequence
  output2[[i]] <- max(mtcars[[i]])      # 3. body
}
output2

# 5 Use piping and a dplyr command to produce the following modified mpg data table 
# that contains only quantitative variables


mpgA<- mpg%>%
  select(displ,cyl,cty,hwy)
mpgA
 
# Now use the special for loop coding chunk illustrated in class to produce the
# variance for all variables of the modified data table.
mpgA

output5 <- vector("double", ncol(mpgA))  # 1. output
for (i in seq_along(mpgA)) {            # 2. sequence
  output5[[i]] <- sd(mpgA[[i]])      # 3. body
}
output5



q()
y


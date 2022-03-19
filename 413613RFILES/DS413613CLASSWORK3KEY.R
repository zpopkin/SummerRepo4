
library(tidyverse)
V <- c("Bears", "Lions", "Dolphins", "Eagles", "Bengals")
#1) Why is the vector show is an atomic vector? (Explain using two 
#or three sentences)

#2) Use and show R code that will extract "Dolphins" from the vector 
# shown above.
V[3]
#3) Use and show Rcode that will extract "Bears" , "Dolphins" and 
# "Bengals" from the vector shown above.
V[c(1,3,5)]
#4) Use and show two Rcoding methods that will show all objects of
# the vector given above except "Bears".
V[-1]
V[2:5]


K <- list( x = 3:7, "never", 43, y = list(10,"f",30))
#5) Why is the vector given above called a list? (Explain in two or
# three sentences) If the vector is a list, identify the type of each
# object.

#6) Use and show R code that will give the length of the vector shown
# above.
length(K)
#7) Use and show R code that will output the fourth object in the vector
# shown above.
str(K[[4]])

#8) Use and show R code that will show all objects in the vector (list)
# given above.


#9) Copy paste and run the tribble given below.

tribble( ~x,    ~y,    ~w,    ~z,
        210,   300,   220,   180,
        102,   100,   119,   187,
        176,   175,   188,   173,
        87,    95,   91,     94,
        202,   210,  234,    218,
        110,   122,  131,    128,
) -> dt
dt

# 9a) Use and show a map function to find the mean of each column of
# the dt data table

map_dbl(dt, mean)

# 9b) Use and show a map function to find the standard deviation of 
# each column of the dt data table.

map_dbl(dt, sd)

# 9c) Use and show a map function that will calculate the squate root
# of each value of each column of the data table dt.

map(dt, ~.^.5)

# 9b) Use R code to find the mean, max, 1st Quartile, 2nd Quartile,
# Median, and Mean for each column of the dt data table. (Hint: You do
# not have to use a map function)

summary(dt)






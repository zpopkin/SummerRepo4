

# FINDING PROBABILITIES, QUARTILES, and PERCENTILES FOR A NORMAL DISTRIBUTION

#  An arbitrary data set is normally distributed with a mean of 65 and a 
# standard deviation of 5

# Example 1 Find the probability that a score is greater than 72.
pnorm(72, mean = 65, sd = 5, lower.tail = F)

# Example 2 Find the probability that a score is less than 63.
pnorm(63, mean = 65, sd = 5, lower.tail = T)


# Example 3 Find the probability that a score is between 58 and 67.
pnorm(67, mean = 65, sd = 5, lower.tail = T) - pnorm(58, mean = 65, sd = 5, lower.tail = T)

# Example 4 Find the 57th percentile
qnorm(p = .57 , mean = 65 , sd = 5, lower.tail = T)

# Example 5 Find Q3
qnorm(p = .75 , mean = 65 , sd = 5, lower.tail = T)

CTS <- c(72, 77, 71, 68, 74, 70, 80, 60, 73, 66, 77, 84, 73, 73, 70, 84, 88, 74, 78, 64)
CTS
sd(CTS)
hist(CTS)
boxplot(CTS)
summary(CTS)
qqnorm(CTS)
qqline(CTS)
t.test(CTS, mu = 76, alternative = "two.sided", conf.level = .95)

library(tidyverse)
mtcars
qqnorm(mtcars$mpg)
hist(mtcars$mpg)
boxplot(mtcars$mpg)

t.test(mtcars$mpg, mu=23, alternative = "less", conf.level = .95)

prop.test(x = 624,  n = 1200, p = .5, 
          
          alternative = "two.sided", correct = FALSE)

prop.test(x = 352, n = 676, p = .5, alternative = "greater", conf.level = .95, correct = FALSE)

prop.test(x = 171, n = 200, p = .85, alternative = "greater", conf.level = .95, correct = FALSE)

prop.test (x = 75, n= 200, p = .3,  alternative ="greater", conf.level = .95, correct = FALSE)

prop.test (x = 352, n= 676, p = .5,  alternative ="greater", conf.level = .95, correct = FALSE)




q()
y


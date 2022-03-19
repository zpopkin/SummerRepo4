library(tidyverse)
library(ggplot2)


#One sample t test example

c(119,131,115,107,125,96,128,99,103,103,105,109)->k
k


t.test(k,mu=100, alternative = "greater", conf.level = .95)

#Two Sample T test
c(119,131,115,107,125,96,128,99,103,103,105,109)->L
L

c(120,140,112,109,114,116,99,108,109,111,109,131,117,101)->D
D

t.test(L,D, mu =0, var.equal=FALSE)

#Paired t test


c(21,19.3,18.7,20,19.24,18.77,22,20.45,21.3)->B
B
c(19.6,20.1,22,19.88,18.77,21.5,23,19,20.334)->A
A
t.test(B,A,paired = TRUE)


#Sieep Data Analysis
library(ggplot2)

sleep
?sleep
#One Sample t test

# make the qqplot to check for Normality
qqnorm(sleep$extra)
qqline(sleep$extra)

t.test(sleep$extra, mu=0, alternative = "two.sided")

#Two sample t test  (Pooled variances method)
sleep
t.test(extra ~ group, sleep , var.equal = TRUE)

#Matched Pairs test
sleep

# Sort by group then ID
sleep1 <- sleep(order(sleep$group, sleep$ID))

# Paired t-test
t.test(extra ~ group, sleep1, paired=TRUE)

#Alternate Method
E1<-c(.7,-1.6,-0.2,-1.2,-.1,3.4,3.7,0.8,0,2.0)
E1

E2<-c(1.9,0.8,1.1,0.1,-0.1,4.4,5.5,1.6,4.6,3.4)
E2

t.test(E1, E2,  paired = TRUE)
        

#Mathched Pairs Dementia Problem

MoonDays<-c(3.33,3.67,2.67,3.33,3.33,3.67,4.67,2.67,6,4.33,3.33,.67,
            1.33,.33,2)
MoonDays

OtherDays<-c(.27,.59,.32,.19,1.26,.11,.30,.40,1.59,.60,.65,.69,1.26,
             .23,.38)
OtherDays
t.test(MoonDays, OtherDays,  paired = TRUE)

q()
y

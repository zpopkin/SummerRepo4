
# Chapter 13  Dates and Times
install.packages("lubridate")
install.packages("nycflights13")

library(tidyverse)
library(nycflights13)
library(lubridate)  # new package
library(dplyr)


# Determine the accurate Date using R
today()

# Determine the accurate Date and time using R
now()

# Parsing strings for Dates using lubricate functions

#  year month day

("2020-06-28")   #ymd

("June 28th, 2020")   #mdy

("28th, June, 2020")   #dmy

(20200628)       #ymd

# Parsing strings for Dates and times using lubricate functions

# year month day hours minutes seconds


("2020-06-28 15:14:23" )    # ymd_hms

("06/28/2020 03:24")  # mdy_hm


ymd(20200628, tz ="UTC")    # UTC  Coordinated Universal Time 

# Example: Consolidate elements of dates and time by using coding make_date( ) and 
# make_datetime( )

flights

flights%>%
  select(year,month,day,hour,minute)


flights%>%
  select(year,month,day,hour,minute)%>%
  mutate(
    departure = make_datetime(year,month,day,hour,minute))-> flights1
flights1

View(flights1)


flights

# Lets create a function to change the representation for
# time elements in the data table

15/7

15%/%7
15%%7
make_datetime_100 <- function(year, month, day, time) {
  make_datetime(year, month, day, time %/% 100, time %% 100)
}

flights %>% 
  filter(!is.na(dep_time), !is.na(arr_time)) %>% 
  mutate(
    dep_time = make_datetime_100(year, month, day, dep_time),
    arr_time = make_datetime_100(year, month, day, arr_time),
    sched_dep_time = make_datetime_100(year, month, day, sched_dep_time),
    sched_arr_time = make_datetime_100(year, month, day, sched_arr_time)
  ) %>% 
  select(origin, dest, ends_with("delay"), ends_with("time")) ->

flights_dt
flights_dt

View(flights_dt)

  
# Using Accessor Functions to extract Date Time components 

  
datetime <- ymd_hms("2020-06-28 14:25:13")
datetime

year(datetime)
month(datetime)
month(datetime, label = TRUE)
mday(datetime)
yday(datetime)
wday(datetime)
wday(datetime, label = TRUE)
# Will this coding work for hour, minute, and second ?
hour(datetime)
minute(datetime)
second(datetime)


# Application of wday

  # Let's create a bar graph that will show count frequencies
  # for days of the week.

# Text book coding

  flights_dt %>% 
  mutate(wday = wday(dep_time, label = TRUE)) %>% 
  ggplot(aes(x = wday)) +
  geom_bar() 
  
# My coding
  
  flights_dt %>% 
    mutate(wday = wday(dep_time, label = TRUE))%>%
    select(origin, dest, dep_time, wday)->
  flights_dt2
  flights_dt2
  
  ggplot(data = flights_dt2) +
    geom_bar(mapping = aes(x = wday, fill = wday))
    
  
  # Setting Components
  
  # Accessor functions can be used to set components
  
  ymd_hms("2020-06-28 14:16:05") -> datetime
  datetime

# Change the year to 2025
  
 2025-> year(datetime)
 datetime
 
# Change the month to 11
 
11 -> month(datetime)
datetime

# Change multiple components by using update

update(datetime, year = 2019, month = 5, day = 12, hour = 10, minute = 8, second = 22)

# Time Spans
# Durations (exact number of seconds)

# Let's change 15 minutes to seconds
dminutes(15)

# Let's change 2 hours to seconds
dhours(2)

# Let's change 1,2,3,and 4 days to seconds
ddays(1:4)

# Another way to designate an amount of seconds
dseconds(32)

# R can use seconds conversions to add, subtract,multiply,
# and divide time units.

# Lets add 3 weeks to 5 days by converting to seconds

dweeks(3) + ddays(5)

# Lets subtract 72 seconds from 2 minutes
dminutes(2) - dseconds(72)

# Durations designations have limitations regarding some
# calculations that involve daylight savings time and 
# different time zone considerations.  It is better to 
# use Periods


# Periods  

    seconds(25)
    minutes(7)
    hours(13)
    days(5)
    weeks(2)
    months(9)
    years(3)

# Adding and multiplying with Periods
    years(3) + months(3)
    days(45) + months(2)
    3* days(27)
    
    now() + days(2)
    
    
# Intervals (Should be used because not all time units
# have the same number of subtime units)
    
# Example
    
# It should be clear that dyears(1)/ddays(365) is 
# approximately 1
    dyears(1)/ddays(365)

# Now consider the computation years(1)/days(1). Intuitively, 
# this answers the question "how many days are in a year.  
# 365
    years(1)/days(1)
    
# Some years have 365 days and some years have 366 days!! 

# In an ordinary year, if you were to count all the days 
# in a calendar from January to December, you'd 
# count 365 days. But approximately every four years, 
# February has 29 days instead of 28. So, there are 366 days
# in the year.
    
# Now let's find the exact date, one year from now.
  next_year <- today() + years(1)
  next_year
    
    
# Hence You should use Intervals !!
  (today() %--% next_year)/ddays(1)
 
    
    
# If you want to find out how many periods fall into an interval, 
# use %/%
    
    # How many days are there from today's date and 1 year
    # from now ?
    (today() %--% next_year)%/%days(1)
    
    # How many months are there from today's date and 1 year
    # from now ?
    
    (today() %--% next_year)%/%months(1)
    

# TIME ZONES

# different time zones; there are so many !!
OlsonNames()  

# How many time zones are there ?
length(OlsonNames())  

# What is your time zone ?
Sys.timezone()





q()
y

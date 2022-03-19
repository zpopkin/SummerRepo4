install.packages("tidycensus")
library(tidycensus)
library(tidyverse)
library(dplyr)
library(ggplot2)

# Web Scraping using an API
# What is an API ?

# API stands for Application Programming Interface, which is
# a software intermediary that allows two applications to talk to each
# other. Each time you use an app like Facebook, send an instant
# message, or check the weather on your phone, you're using an API.

# Informally, an API is code, software, an electronic system, that
# makes it possible for information or data to be retrieved and
# interpreted.

# The link to an excellent post describing API's in more detail is
# given below

# https://www.mulesoft.com/resources/api/what-is-an-api

# In order to obtain the services of an organization's API, it is 
# common to use what is called an API key. An API key is a code
# identifier that gives the user access.

# We will use an API key in the process of retrieving data from the
# US Census Bureau.

# Use this link to get a census API Key  
#  http://api.census.gov/data/key_signup.html  

census_api_key("2153faf1e1d25707ef71c8c464cb4c2c08be4e76")
install = TRUE

# From the US census data bank, we will get the median age by state
# for 2010.

# The following link is to be used to get information on the Basic
# usage of tidycenus

# https://walker-data.com/tidycensus/

# Use the following link to get variable codes and their descriptions.

# https://api.census.gov/data/2010/dec/sf1/variables.html

# Use Census data to get the median age by state in 2010

age10 <- get_decennial(geography = "state", 
                       variables = "P013001", 
                       year = 2010)
age10



# Total females by state who were 17 years old in 2010

age17_10 <- get_decennial(geography = "state", 
                       variables = "P014031", 
                       year = 2010)
age17_10

# We can now use R coding to get summary numbers on the variable
mean(age17_10$value)

max(age17_10$value)

summary(age17_10$value)


# ACS Data

# ACS (American Community Survey)  Based on a sample of 3 million
# households. Not as comprehensive or complete as the standared
# US census. 

# We will focus on the 5 year ACS data collection process.


# Let's find median household income data from 2014 to 2018 for
# counties in the state of Vermont.

# We need to find variable codes

v15 <- load_variables(2015, "acs5", cache = TRUE)

View(v15)

CA <- get_acs(geography = "county", 
              variables = c(medincome = "B01001A_011"), 
              state = "CA", 
              year = 2015)

CA

# moe (margin of error)

mean(vt$moe)
median(vt$estimate)

vt %>%
  mutate(NAME = gsub(" County, Vermont", "", NAME)) %>%
  ggplot(aes(x = estimate, y = reorder(NAME, estimate))) +
  geom_errorbarh(aes(xmin = estimate - moe, xmax = estimate + moe)) +
  geom_point(color = "red", size = 3) +
  labs(title = "Household income by county in Vermont",
       subtitle = "2014-2018 American Community Survey",
       y = "",
       x = "ACS Estimate (Bars represent margin of error)")

# Let's generate a similar table and graph for Delaware.

PA <- get_acs(geography = "county", 
              variables = c(medincome = "B19013_001"), 
              state = "PA", 
              year = 2017)
PA




PA %>%
  mutate(NAME = gsub(" County, Pennsylvania", "", NAME)) %>%
  ggplot(aes(x = estimate, y = reorder(NAME, estimate))) +
  geom_errorbarh(aes(xmin = estimate - moe, xmax = estimate + moe)) +
  geom_point(color = "blue", size = 4) +
  labs(title = "Household income by county in Pennsylvania",
       subtitle = "2014-2018 American Community Survey",
       y = "",
       x = "ACS estimate (bars represent margin of error)")

# Estimate of Total White males between 35 years old and 44 years old 
# B01001A_011
library(tidycensus)
library(tidyverse)
library(dplyr)
library(ggplot2)
census_api_key("2153faf1e1d25707ef71c8c464cb4c2c08be4e76")
install = TRUE

v15 <- load_variables(2015, "acs5", cache = TRUE)


CA <- get_acs(geography = "county", 
              variables = c(medincome = "B01001A_011"), 
              state = "CA", 
              year = 2015)
CA


CA%>%
  filter(estimate > 30000)%>%
  arrange(desc(estimate)) -> CA1
CA1

CA1%>%
  filter(estimate == 51644 , moe == 667) -> CA2
CA2



CA1 %>%
  mutate(NAME = gsub(" County, California", "", NAME)) %>%
  ggplot(aes(x = estimate, y = reorder(NAME, estimate))) +
  geom_errorbarh(aes(xmin = estimate - moe, xmax = estimate + moe)) +
  geom_point(color = "blue", size = 3) +
  labs(title = "Median Income for White Males by County",
       subtitle = "2014-2018 American Community Survey",
       y = "",
       x = "ACS estimate (bars represent margin of error)")
CAI

boxplot(CA1$estimate)

ggplot(data = CA1) +
  geom_boxplot(mapping = aes(y = estimate), fill = "red") +
  coord_flip()


q()
y
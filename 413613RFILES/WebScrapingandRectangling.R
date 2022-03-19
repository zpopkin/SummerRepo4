
install.packages("rvest")
library(rvest)
library(dplyr)
library(tidyverse)
install.packages("repurrrsive")
library(repurrrsive)
install.packages("listviewer")


listviewer::jsonedit(gh_users)


# RECTANGLING (Transforming a complicated list, called a nested list,
# into a data frame the is easier to interpret and process)

# Nested Lists -> lists withing a list.

# Here is a basic example that we studied previously
#  X = list(23, 3.01, "alpha", b = (100, 2.033, "rail", NA)). Note that we
# we have a list within a list. List b is nested in List X

# Our cases and examples will be more involved but the basic idea is the 
# same.

# Let's look at a nested list involving 6 Github users

(users <- tibble(user = gh_users))

# Lets take a look at the list data for each Github user

listviewer::jsonedit(gh_users)

# Now use the following code to print out the 30 profile characteristics
# in the console

names(users$user[[1]])

# Now transform the nested data into a data frames  (A representation good for analysis)

users %>%
  unnest_wider(user)
# Note that the characteristics have become column variables

users %>%
  unnest_longer(user)  # not a good representation.  The wider option
# is better.

# You may not want all of the column variables.  You can use the command
# hoist to select the variables and list content that you want.
users %>% hoist(user,
               followers = "followers",
               login = "login",
               url = "html_url")


# Game of Thrones

got_chars  # Lists regarding Game of Thrones characters that provides no 
# special structure or organization


# Let's organize the data into a tibble (18 characteristics for 30 characters)

chars <- tibble(char = got_chars)
chars

# And now look at the data Lets look at the specific data for the 30 names
listviewer::jsonedit(got_chars)   #1, #8, #17 #22


# Now transform the nested data into a data frame

chars2 <- chars %>% unnest_wider(char)
chars2

# This is more complex than gh_users because some components of char are
# themselves a list, giving us a collection of list-columns:

chars2 %>% select_if(is.list)  # check out the different aliases for person 1 in the data table)

# What you do next will depend on the purposes of the analysis. Maybe you 
# want a row for every book and TV series that the character appears in:

chars2 %>% 
  select(name, books, tvSeries) %>% 
  pivot_longer(c(books, tvSeries), names_to = "media", values_to = "value") %>% 
  unnest_longer(value)

# Or maybe you want to build a table that lets you match title to name:
  
chars2 %>% 
  select(name, title = titles) %>% 
  unnest_longer(title)




# WEB SCRAPING

Link <- "https://www.imdb.com/search/title/?genres=action&groups=top_250&sort=user_rating,desc"
page = read_html(Link)
Movienames = page%>% html_nodes(".lister-item-header a")%>%
html_text()
Movienames


Link <- "https://www.imdb.com/search/title/?genres=action&groups=top_250&sort=user_rating,desc"
page = read_html(Link)
years = page%>% html_nodes(".text-muted.unbold")%>%
  html_text()
years



Link <- "https://www.imdb.com/search/title/?genres=action&groups=top_250&sort=user_rating,desc"
page = read_html(Link)
Movieratings = page%>% html_nodes(".ratings-imdb-rating strong")%>%
  html_text()
Movieratings

# Let's organize our collected data into a data frame.

moviesdataframe = data.frame(Movienames,years,Movieratings)
moviesdataframe

# Now let's improve the format and appearance of the data table by transforming
# into a tibble

is_tibble(moviesdataframe)


as_tibble(moviesdataframe)



# Washington DC

Link <- "https://forecast.weather.gov/MapClick.php?CityName=Washington&state=DC&site=LWX&textField1=38.895&textField2=-77.0373&e=1#.YLPCyflKiUk"
page = read_html(Link)
Temperatures = page%>% html_nodes(".temp")%>%
  html_text()
Temperatures

# Let's only output the numbers
parse_number(Temperatures)

# Let's create plots and summaries for the collected data
parse_number(Temperatures) -> y
y

mean(y)
summary(y)
boxplot(y)


Link <- "https://https://forecast.weather.gov/MapClick.php?CityName=Washington&state=DC&site=LWX&textField1=38.895&textField2=-77.0373&e=1#.YLPCyflKiUk"
page = read_html(Link)
Forcasts = page%>% html_nodes(".short-desc")%>%
  html_text()
Forcasts


Weather = data.frame(Temperatures, Forcasts)
Weather

# The data frame has a good structure/display. No need to change to
# a tibble.



Web Scraping  :  Using an API


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

# Using Census data to get the median age by sex in 2010

age10 <- get_decennial(geography = "state", 
                       variables = "P013001", 
                       year = 2010)
age10

# Now use R code to find the mean age for all states

mean(age10$value)

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

# We will focus on the 5 year ACS data


# Let's find median household income data from 2014 to 2018 for
# counties in the state of Vermont.

# We need to find variable codes.  Specifically, lets find data for 2017

v17 <- load_variables(2017, "acs5", cache = TRUE)

View(v17)

vt <- get_acs(geography = "county", 
              variables = c(medincome = "B19013_001"), 
              state = "VT", 
              year = 2017)

vt

# moe (margin of error)

mean(vt$moe)
median(vt$estimate)

?gsub

vt %>%
  mutate(NAME = gsub(" County, Vermont", "", NAME)) %>%
  ggplot(aes(x = estimate, y = reorder(NAME, estimate))) +
  geom_errorbarh(aes(xmin = estimate - moe, xmax = estimate + moe)) +
  geom_point(color = "blue", size = 5) +
  labs(title = "Household income by county in Vermont",
       subtitle = "2014-2018 American Community Survey",
       y = "",
       x = "ACS estimate (bars represent margin of error)")

# Let's generate a similar table and graph for Pennsylvania.

pa <- get_acs(geography = "county", 
              variables = c(medincome = "B19013_001"), 
              state = "PA", 
              year = 2017)
pa




pa %>%
  mutate(NAME = gsub(" County, Pennsylvania", "", NAME)) %>%
  ggplot(aes(x = estimate, y = reorder(NAME, estimate))) +
  geom_errorbarh(aes(xmin = estimate - moe, xmax = estimate + moe)) +
  geom_point(color = "green", size = 3) +
  labs(title = "Household income by county in Pennsylvania
",
       subtitle = "2014-2018 American Community Survey",
       y = "",
       x = "ACS estimate (bars represent margin of error)")








q()
y

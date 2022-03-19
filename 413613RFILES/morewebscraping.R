# More Webscraping Retrieving data tables from the 
# internet

install.packages("rvest")
library(rvest)
library(tidyverse)
library(dplyr)

# example 1

wikiurl <- read_html(
"https://en.wikipedia.org/wiki/List_of_highest-grossing_films")
datatables <- wikiurl%>%
  html_table(., fill = T)

datatables[[3]] -> dt
dt

# Let's generate more rows
dt%>%
  print(n = 100)
  
# example 2

wikiurl <- read_html(
  "https://worldpopulationreview.com/us-cities")
datatables1 <- wikiurl%>%
  html_table(., fill = T)

datatables1[[1]] -> dt1
dt1

as.data.frame(dt1) -> dt1df
dt1df



# example 3   PLAY BALL !!

wikiurl <- read_html("https://www.mlb.com/stats/2019")
baseballdata2019 <- wikiurl%>%
  html_table(., fill = T)

baseballdata2019[[1]] -> BD2019
BD2019

mean(BD2019$HRHR)


BD2021 <- data.frame(baseballdata2021[[1]])
BD2021



wikiurl <- read_html(
"https://www.california-demographics.com/cities_by_population")
Californiacities <- wikiurl%>%
  html_table(., fill = T)

Californiacities[[1]] -> ct
ct

as.tribble(ct)

as.data.frame(ct) -> ctdf
ctdf

ctdf$Population

as.vector(
  ctdf$Population
)

ctdf$Population <- as.integer(ctdf$Population)
ctdf$Population

as.numeric(as.character(ctdf$Population))-> ctdf$Population
ctdf$Population



as.numeric(ctdf$Population)


yyz$b <- as.numeric(as.character(yyz$b))
as.numeric(as.character(ct$Population))-> ct$Population
ct$Population
 
mean(ct$Population)          

ct$Population -> population
population

as.numeric(population)




# Lab







library(tidycensus)
library(tidyverse)
library(dplyr)
library(ggplot2)

1.
census_api_key("fafa6e7c431d63c5dec1875c21b22c0e7dbdbd71")
install = TRUE


2a.

v15 <- load_variables(2015, "acs5", cache = TRUE)
View(v15) 
ca <- get_acs(geography = "county", 
              variables = c(medincome = "B01001A_011"), 
              state = "CA", 
              year = 2015)
mean(ca$moe)
median(ca$estimate)
ca

2b. 

ca%>%
  filter(estimate > 30000)%>%
  arrange(desc(estimate)) -> ca1
ca1

2c.

ca1%>%
  #mutate(variable = recode("medincome" = "Median Income"))
  #filter(estimate == 51644 & moe == 667)
  ggplot(data = ca) +
  geom_point(mapping = aes(x = log(moe), y = log(estimate))) 
  


2d.

ca1 %>%
  ggplot(aes(x=estimate))+
  geom_boxplot(fill="red")

2e.

ca1 %>%
  mutate(NAME = gsub(" County, California", "", NAME)) %>%
  ggplot(aes(x = estimate, y = reorder(NAME, estimate))) +
  geom_errorbarh(aes(xmin = estimate - moe, xmax = estimate + moe)) +
  geom_point(color = "blue", size = 3) +
  labs(title = "Median Income for White Males by County",
       subtitle = "2014-2018 American Community Survey",
       y = "",
       x = "ACS estimate (bars represent margin of error)")



q()
y
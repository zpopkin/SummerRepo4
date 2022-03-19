
library(tidyverse)
library(dplyr)

#3
tribble( ~John,    ~Raymond,    ~Martha,    ~Alice,   ~Juan,
         86,            77,                  81,              88,           90,
         79,            78,                  85,              81,           78,
         76,            75,                  88,              94,           81,
         84,            90,                  71,               84,           89,
         100,          80,                  93,              85,            84,
         90,            73,                  70,              88,            93,
) -> TestScores
TestScores

TestScores%>%
  map(median)

TestScores%>%
  map(~. **(1/3))

TestScores%>%
  map(~. -.)

#4

z <- matrix( nrow = 3, ncol = 4)
for (m in 1:3) {
  for (n in 1:4) {
    z[m, n] <- -1*((m + n))^2
  }
}
print(z)


#6  Selector gadget problem

library(rvest)
library(dplyr)
library(tidyverse)

Link <- "https://www.imdb.com/list/ls096735829/ "
page = read_html(Link)
Movies2020 = page%>% html_nodes(".lister-item-header a")%>%
  html_text()
Movies2020

Link <- "https://www.imdb.com/list/ls096735829/ "
page = read_html(Link)
Directors2020 = page%>% html_nodes(" .text-muted a:nth-child(1) ")%>%
  html_text()
Directors2020

Link <- "https://www.imdb.com/list/ls096735829/ "
page = read_html(Link)
Ratings2020 = page%>% html_nodes(" .ipl-rating-star.small .ipl-rating-star__rating ")%>%
  html_text()
Ratings2020

Link <- "https://www.imdb.com/list/ls096735829/ "
page = read_html(Link)
Runtime2020 = page%>% html_nodes(" .runtime ")%>%
  html_text()
Runtime2020

MovieFacts = data.frame(Movies2020, Directors2020, Ratings2020, Runtime2020)
MovieFacts

as_tibble(MovieFacts)


q()
y

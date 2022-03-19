
install.packages("tidytext")
library(tidytext)
install.packages("textdata")
library(textdata)
get_sentiments("afinn")

get_sentiments("bing")


get_sentiments("nrc")

library(tidyverse)
library(janeaustenr)
library(dplyr)
library(stringr)

tidy_books <- austen_books() %>%
  group_by(book) %>%
  mutate(
    linenumber = row_number(),
    chapter = cumsum(str_detect(text, 
                                regex("^chapter [\\divxlc]", 
                                      ignore_case = TRUE)))) %>%
  ungroup() %>%
  
  
  
  text <- c("Because I could not stop for Death -",
            "He kindly stopped for me -",
            "The Carriage held but just Ourselves -",
            "and Immortality")
  text


  library(dplyr)
  text_df <- tibble(line = 1:4, text = text)
  
  text_df
  
  library(tidytext)
  
  text_df %>%
    unnest_tokens(word, text)
  
  
  library(janeaustenr)
  library(dplyr)
  library(stringr)
  
  original_books <- austen_books() %>%
    group_by(book) %>%
    mutate(linenumber = row_number(),
           chapter = cumsum(str_detect(text, 
                                       regex("^chapter [\\divxlc]",
                                             ignore_case = TRUE)))) %>%
    ungroup()
  
  original_books
  
  library(tidytext)
  tidy_books <- original_books %>%
    unnest_tokens(word, text)
  
  tidy_books
  
  
  data(stop_words)
  
  tidy_books <- tidy_books %>%
    anti_join(stop_words)
  
  
  tidy_books %>%
    count(word, sort = TRUE) 
  
  library(ggplot2)
  
  tidy_books %>%
    count(word, sort = TRUE) %>%
    filter(n > 600) %>%
    mutate(word = reorder(word, n)) %>%
    ggplot(aes(n, word)) +
    geom_col(fill = "red", color = "blue") +
    labs(y = NULL)
  
  
  
# Creating a word cloud
  
  install.packages("wordcloud")
  library(wordcloud)install.packages("RColorBrewer")
  library(RColorBrewer)install.packages("wordcloud2")
  install.packages("wordcloud2")
  library(wordcloud2)

  
  install.packages("tm")
  library(tm)
  
  
  CV <- c("blue", "red", "red",  "green", "brown", 12, "yellow",
          "tan", "purple", "to", "orange", "purple", "white", "purple")
  CV
  
  library(tidyverse)
  library(dplyr)
  
  docs <- CV %>%
    tm_map(removeNumbers) %>%
    tm_map(removePunctuation) %>%
    tm_map(stripWhitespace)%>%
    tm_map(docs, content_transformer(tolower))%>%
    tm_map(docs, removeWords, stopwords("english"))
  docs
  
  
  
  docs <- tm_map(docs, content_transformer(tolower))
  docs <- tm_map(docs, removeWords, stopwords("english"))
  
  wordcloud2(data=df, size=1.6, scale = c(3.5, 0.25), color='random-dark')
  
  iris
# Word Cloud Example
  
  install.packages("tm")  # for text mining
  install.packages("SnowballC") # for text stemming
  install.packages("wordcloud") # word-cloud generator 
  install.packages("RColorBrewer") # color palettes
  
  library("tm")
  library("SnowballC")
  library("wordcloud")
  library("RColorBrewer")
  
  filePath <- "http://www.sthda.com/sthda/RDoc/example-files/martin-luther-king-i-have-a-dream-speech.txt"
  text <- readLines(filePath)
  
  
  text <- c("Because I could not stop for Death -",
            "He kindly stopped for me -",
            "The Carriage held but just Ourselves -",
            "and Immortality")
  
  text
  
  
  text <-c("We thus define the tidy text format as being a table
  with one-token-per-row. A token is a meaningful unit of text, such as a word,
  that we are interested in using for analysis, and tokenization is 
  the process of splitting text into tokens. This one-token-per-row
  structure is in contrast to the ways text is often stored in 
  current analyses, perhaps as strings or in a document-term matrix.
  For tidy text mining, the token that is stored in each row is
  most often a single word, but can also be an n-gram, sentence, or
  paragraph. In the tidytext package, we provide functionality to 
  tokenize by commonly used units of text like these and convert 
  to a one-term-per-row format.")

  text
  
  
  
  
  docs <- Corpus(VectorSource(text))
  docs
  
  inspect(docs)
  
  toSpace <- content_transformer(function (x , pattern ) gsub(pattern, " ", x))
  docs <- tm_map(docs, toSpace, "/")
  docs <- tm_map(docs, toSpace, "@")
  docs <- tm_map(docs, toSpace, "\\|")
  
  # Convert the text to lower case
  docs <- tm_map(docs, content_transformer(tolower))
  # Remove numbers
  docs <- tm_map(docs, removeNumbers)
  # Remove english common stopwords
  docs <- tm_map(docs, removeWords, stopwords("english"))
  # Remove your own stop word
  # specify your stopwords as a character vector
  docs <- tm_map(docs, removeWords, c("blabla1", "blabla2")) 
  # Remove punctuations
  docs <- tm_map(docs, removePunctuation)
  # Eliminate extra white spaces
  docs <- tm_map(docs, stripWhitespace)
  # Text stemming
  # docs <- tm_map(docs, stemDocument)
  
  library(data.table)
  
  dtm <- TermDocumentMatrix(docs)
  dtm
  m <- as.matrix(dtm)
  v <- sort(rowSums(m),decreasing=TRUE)
  d <- data.frame(word = names(v),freq=v)
  head(d, 10)
  
  set.seed(1234)
  wordcloud(words = d$word, freq = d$freq, min.freq = 1,
            max.words=600, random.order=FALSE, rot.per=0.35, 
            colors=brewer.pal(8, "Dark2"))
  
  
  q()
  y
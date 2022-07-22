library(tidyverse)
library(textdata)
library(tidytext)

# TEXT MINING (Extracting, Processing, Organizing, Summarizing,
# and producing visualizations for text data) 


# Text body 1

text <- c("Because I could not stop for Death -",
          "He kindly stopped for me -",
          "The Carriage held but just Ourselves -",
          "and Immortality")

text

# Text body 2

text <-   c("We thus define the tidy text format as being a table",
            "with one-token-per-row. A token is a meaningful unit of text, such as a word",
            "that we are interested in using for analysis, and tokenization is", 
            "the process of splitting text into tokens. This one-token-per-row",
            "structure is in contrast to the ways text is often stored in", 
            "current analyses, perhaps as strings or in a document-term matrix.",
            "For tidy text mining, the token that is stored in each row is",
            "most often a single word, but can also be an n-gram, sentence, or",
            "paragraph. In the tidytext package, we provide functionality to", 
            "tokenize by commonly used units of text like these and convert", 
            "to a one-term-per-row format.")

text

# Text body 3  famous poem

text <- c("No man is an island",
          "Entire of itself",
          "Every man is a piece of the continent",
          "A part of the main.",
          "If a clod be washed away by the sea",
          "Europe is the less.",
          "As well as if a promontory were.",
          "As well as if a manor of thy friend's",
          "Or of thine own were:",
          "Any man's death diminishes me",
          "Because I am involved in mankind",
          "And therefore never send to know for whom the bell tolls;",
          "It tolls for thee.")

text



# Text body 4   famous poem

text <-c("Hold fast to dreams",
         "For if dreams die",
         "Life is a broken-winged bird",
         "That cannot fly.",
         "Hold fast to dreams",
         "For when dreams go",
         "Life is a barren field",
         "Frozen with snow.")
text

library(tidyverse)

# Step 1 Locate the text and create a tibble
library(dplyr)
text_df <- tibble(line = 56:63, text = text)

text_df

# Step 2 Find line locations for each word in the text
library(tidytext)

text_df %>%
  unnest_tokens(word, text) -> dff
dff


# Step 3  Find frequencies for each word
dff %>%
  count(word, sort =TRUE) %>% 
  filter(n >= 1)


# Step 4  Create a Data visual (Bar Graph) showing and comparing word
# frequencies



library(ggplot2)

dff %>%
  count(word, sort =TRUE) %>% 
  filter(n >= 1) %>%
  mutate(word = reorder(word, n)) %>%
  ggplot(aes(n, word)) +
  geom_col(fill = "blue", color = "red") +
  labs(y = NULL)

library(tidytext)

get_sentiments("afinn")

get_sentiments("bing")

get_sentiments("nrc")


bing_word_counts <- tidy_books %>%
  inner_join(get_sentiments("bing")) %>%
  count(word, sentiment, sort = TRUE) %>%
  ungroup()

install.packages("janeaustenr")
library(janeaustenr)
library(dplyr)
library(stringr)
library(tidyr)
library(tidyverse)
library(tidytext)

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
  unnest_tokens(word, text)

tidy_books

View(tidy_books)

print(tidy_books, n = 40)

tidy_books%>%
  filter(chapter == 4)



nrc_joy <- get_sentiments("nrc") %>% 
  filter(sentiment == "joy")
nrc_joy

tidy_books%>%
  filter(book == "Emma") %>%
  inner_join(nrc_joy) %>%
  count(word, sort = TRUE)


library("tm")
library("SnowballC")
library("wordcloud")
library("RColorBrewer")

tidy_books %>%
  anti_join(stop_words) %>%
  count(word) %>%
  with(wordcloud(word, n, max.words = 100))




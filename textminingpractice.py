

text1 = "There are so many problems in the world. It is often " \
"difficult to determine what resources and strategies are " \
" needed to address these problems as they confront us" \
" We must however, continue working to find solutions and answers"

print(text1)

# Let's find the length of the text (how many characters)

print(len(text1))

# Let's separate the sentence(s) into words
text2 = text1.split(' ')
print(text2)

# Let's find the number of words in the sentence
print(len(text2))

# Let's find words that have more than four characters

print([w for w in text2 if len(w) > 4])

# Let's find words that have capital letters

print([w for w in text2 if w.istitle()])

# let's find words that end with a
print([w for w in text2 if w.endswith("s")])
print([w for w in text2 if w.startswith("o")])

# Word Clouds

#from wordcloud import WordCloud, STOPWORDS, ImageColorGenerator
import pandas as pd
#import matplotlib.pylab as plt
#from PIL import Image
import numpy as np

#stopwords = set(STOPWORDS)

from wordcloud import WordCloud
import matplotlib.pyplot as plt

#text = "It is now time for all good men to stand up and demand a changes that will benefit men and women everywhere"
text = "There are so many problems in the world. It is often difficult " \
       "to determine what resources and strategies are needed to address these problems as they confront us" \
       " We must however, continue working to find solutions and answers"
cloud = WordCloud(background_color="pink").generate(text)
plt.imshow(cloud)
plt.axis("off")
plt.show()




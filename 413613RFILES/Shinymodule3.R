
library(tidyverse)
library(ggplot2)
library(shiny)

# The format of every app.R file looks like this

# Define UI for application
ui <- fluidPage(
  ## Stuff for defining user-interface
  ## e.g. Title,
  ##      Table of contents
  ##      Location of inputs (sliders and buttons)
)

# Define server logic
server <- function(input, output) {
  ## Stuff for running R code
  ## e.g. Run a linear model.
  ##      Manipulate a data frame
  ##      Make a plot.
}

# Run the application
shinyApp(ui = ui, server = server)


#  Input UI Elements


#Text Inputs

# Use textInput() to collect one line of text.
# Use passwordInput() to collect one line of text which is not 
# displayed on the screen as it is entered.
#  NOTE: This is not a secure way to collect passwords by itself.
# Use textAreaInput() to collect multiple lines of text.


ui <- fluidPage(
  titlePanel("Example1"),
  textInput("name", "What's your name?"),
  passwordInput("password", "What's your password?"),
  textAreaInput("story", "Tell me about yourself")
  
)

server <- function(input, output, session) {
  
}

shinyApp(ui, server)



# Numeric Inputs

# Use numericInput() to create a text box that only accepts numeric 
# values.
# Use sliderInput() to create a number slider.
# Giving the value argument one number will result in a one-sided 
# slider.
# Giving the value argument a vector of two numbers will result in a 
# two-sided slider.

ui <- fluidPage(
  titlePanel("Numeric Inputs"),
  numericInput("num1", "Number one", value = 0, min = 0, max = 150),
  sliderInput("num2", "Number two", value = 50, min = 0, max = 100),
  sliderInput("rng", "Range", value = c(10, 20), min = 0, max = 100)
)

server <- function(input, output) {
  
}

shinyApp(ui = ui, server = server)

# You can see more on sliders at https://shiny.rstudio.com/articles/sliders.html.

# Date Inputs

# Use dateInput() to collect a single date.

# Use dateRangeInput() to collect two dates.


ui <- fluidPage(
  dateInput("dob", "When were you born?"),
  dateRangeInput("holiday", "When do you want to go on vacation?")
)

server <- function(input, output) {
  
}

shinyApp(ui = ui, server = server)


# Multiple Choice

# Use selectInput() to provide the user with a drop-down menu.

# Use radioButtons() to have a multiple choice button selection where
# only one selection is possible.

# Use checkboxGroupInput() to have a multiple choice button selection
# where multiple selections are possible.

weekdays <- c("Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat")
ui <- fluidPage(
 selectInput("state", "Where do you live?", choices = state.name),
 radioButtons("weekday", "What's your favorite day of the week?",
             choices = weekdays),
 checkboxGroupInput("weekday2", "What days do you work?", 
              choices = weekdays)
)

server <- function(input, output) {
  
}

shinyApp(ui = ui, server = server)

# Columns of a Data Frame

# For a data frame named df, just use selectInput(), with the choices
# = names(df) option.


ui <- fluidPage(
  titlePanel("Data Frames Columns"),
  selectInput("carcol", "Which Column?", choices = names(mtcars))
)

server <- function(input, output) {
  
}

shinyApp(ui = ui, server = server)

# Binary Inputs

# Use checkboxInput() to get a TRUE/FALSE or Yes/No answer

ui <- fluidPage(
  checkboxInput("startrek", "Like Star Trek?")
)

server <- function(input, output) {
  
}

shinyApp(ui = ui, server = server)


# Action Buttons

# Use actionButton() to create a clickable button, or actionLink()
# to create a clickable link.

ui <- fluidPage(
  actionButton("click", "Click me!"),
  actionLink("Link", "No, click me!")
)

server <- function(input, output) {
  
}

shinyApp(ui = ui, server = server)




# Output UI Elements

# Output functions are placeholders for things created in the 
# server() function (like plots and tables).

# Each output function has a label as its first argument. The 
# server() can access this element as an element of the output list.
# For example, if the label is "plot", then the server function can
# insert a plot into output$plot.

# Each output function in the UI is associated with a render function
# in the server().
# A render function basically creates HTML code given an expression.
# An expression is just R code surrounded by curly braces {}.


# Text Output

# Use textOutput() to display text.
# Use verbatimTextOutput() to display code.

# You create text in the server() function by either renderText() or
# renderPrint().

# renderText() will display text returned by code. Functions can 
# only return one thing.

# renderPrint() will display text printed by code. Functions can 
# print multiple things.


ui <- fluidPage(
  titlePanel("Output Stuff"),
  textOutput("text"),
  verbatimTextOutput("code")
)

server <- function(input, output, session) {
  output$text <- renderText({
    "Hello World!"
  })
  
  output$code <- renderPrint({
    summary(c(1, 2, 3, 4))
  })
}

shinyApp(ui = ui, server = server)


# Output Tables

# Use tableOutput() to print an entire table created in the server 
# by renderTable(). Should only be used for small tables.

ui <- fluidPage(
  tableOutput("static")
)

server <- function(input, output, session) {
  output$static <- renderTable({
    head(mtcars)
  })
}

shinyApp(ui = ui, server = server)

# Use dataTableOutput() to output a dynamic table created in the 
# server by renderDataTable().

ui <- fluidPage(
  dataTableOutput("dynamic")
)

server <- function(input, output, session) {
  output$dynamic <- renderDataTable({
    mtcars
  })
}

shinyApp(ui = ui, server = server)

# You can change the appearance of dataTableOutput() by passing 
# arguments as a list to the options argument in renderDataTable().

# You can find these options at: https://datatables.net/reference/option/


# Output Plots

# Use plotOutput() to output plots created by renderPlot() in the 
# server() function.

library(shiny)
library(ggplot2)

ui <- fluidPage(
  plotOutput("plot")
)

server <- function(input, output, session) {
  output$plot <- renderPlot({
    ggplot(mpg, aes(x = displ, y = hwy)) +
      geom_point(color = "red") +
      theme_bw() +
      ggtitle("Scatter Plot") +
      xlab("Displacement") +
      ylab("Highway MPG")
  })
}

shinyApp(ui = ui, server = server)


# ggplot2 and non-standard evaluation

# Why won't the following code work?
data("mtcars")
myvariable <- "mpg"
ggplot(mtcars, aes(x = myvariable)) +
  geom_histogram()

# ggplot2 is trying to create a histogram for myvariable, but 
# myvariable is not a variable of the data set mtcars.

# Solution: use .data

data("mtcars")
myvariable <- "mpg"
ggplot(mtcars, aes(x = .data[[myvariable]])) +
  geom_histogram()

# In Shiny, you only need to use the .data object when interacting
# with a variable in the tidyverse functions (e.g. mutate(), 
# filter(), summarize(), ggplot(), etc.).


#  Putting Inputs and Outputs Together

# Let's build a very simple shiny app that allows the user choose two
# variables from mtcars and then plots them.

library(shiny)
library(ggplot2)

ui <- fluidPage(
  titlePanel("Putting things together"),
  selectInput("var1", "Variable 1", choices = names(mtcars)),
  selectInput("var2", "Variable 2", choices = names(mtcars)),
  plotOutput("plot")
)

server <- function(input, output) {
  output$plot <- renderPlot({
    ggplot(mtcars, aes(x = .data[[input$var1]], y = .data[[input$var2]])) +
      geom_point(color = "blue") +
      ggtitle("Mtcars Scatter Plot")
  })
}

shinyApp(ui = ui, server = server)
# Homework Problems

#1
ui <- fluidPage(
  titlePanel("Mtcars Histograms"),
  selectInput("vars", "mtcars variables", 
  choices = names(mtcars)),
  plotOutput("plot"),

)

server <- function(input, output) {
  output$plot <- renderPlot({
    ggplot(mtcars, aes(x = .data[[input$vars]])) +
      geom_histogram(fill = "red") +
      ggtitle("Mtcars Scatter Plot")
   
  })
}

shinyApp(ui = ui, server = server)


mtcarsvariables <- c("mpg","cyl","disp","hp","drat","wt",
          "qsec","vs","am","gear","carb")
ui <- fluidPage(
  titlePanel("mtcars data"),
  textOutput("text"),
  verbatimTextOutput("code"),
  checkboxGroupInput("mtcarsvar", "For which mtcars variables
        is mean>median?", choices = mtcarsvariables)
)

server <- function(input, output, session) {
  output$text <- renderText({
    "mtcars summaries"
  })
  
  output$code <- renderPrint({
    summary(mtcars)
  })
}

shinyApp(ui = ui, server = server)


q()
y



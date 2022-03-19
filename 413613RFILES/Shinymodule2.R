install.packages("shiny")
library(shiny)

# Structure of a Shiny App

# Shiny apps are contained in a single script called app.R.
# The script app.R lives in a directory (for example, 
# newdir/) and the app can be run with runApp("newdir").


# app.R has three components:
  
  #a user interface object

  #a server function

  #a call to the shinyApp function

# 1) The user interface (ui) object controls the layout and 
# appearance of your app.

# 2) The server function contains the instructions that your
# computer needs to build your app

# 3) Finally the shinyApp function creates Shiny app objects 
# from an explicit UI/server pair.


# Examples of basic shiny apps

runExample("01_hello")      # a histogram

runExample("04_mpg")        # global variables

runExample("02_text")       # tables and data frames



library(shiny)
ui <- fluidPage(sliderInput(inputId = "num",
                            label = "Choose a number",
                            value = 25, min = 1, max = 100),
                plotOutput("hist")
)
server <- function(input, output) {
  output$hist <-renderPlot({
    title <- "Random Normal Values"
    hist(rnorm(input$num), main = title)
  })
}
shinyApp(ui = ui, server = server)

# modified app

library(shiny)
ui <- fluidPage(sliderInput(inputId = "num",
                            label = "Choose a number",
                            value = 25, min = 1, max = 100),
                plotOutput("hist")
)
server <- function(input, output) {
  output$hist <-renderPlot({
    title <- "Random Normal Values"
    hist(rnorm(input$num),col = "red", border = "blue",
         main = title)
  })
}
shinyApp(ui = ui, server = server)


library(shiny)

# define the user interface object with the appearance of the app
ui <- fluidPage(
  numericInput(inputId = "n", label = "Sample size", value = 25),
  plotOutput(outputId = "hist")
)

# define the server function with instructions to build the
# objects displayed in the ui
server <- function(input, output) {
  output$hist <- renderPlot({
    hist(rnorm(input$n))
  })
}

# call shinyApp() which returns the Shiny app object
shinyApp(ui = ui, server = server)




q()
y



library(shiny)
library(tidyverse)
library(ggplot2)

# Creating basic Jitter
ggplot(ChickWeight, aes(x = Diet, y = weight, color = Diet)) + 
  geom_violin(fill = "blue") +
  geom_jitter(position = position_jitter(0.3)) 


ui <- fluidPage(
  titlePanel("The Green Boxplot"),
  numericInput(inputId = "n", label = "Sample size", value = 25),
  plotOutput(outputId = "boxplot"),
  verbatimTextOutput("code")
)

# define the server function with instructions to build the
# objects displayed in the ui
server <- function(input, output) {
  output$boxplot <- renderPlot({
    boxplot(rnorm(input$n), col = "green")
  })
  
  output$code <- renderPrint({
    summary(rnorm(input$n))
    
  })
}


ui <- fluidPage(
  h2("Putting things together", style = "color:red"),
  h5("Plots from the mtcars data table" , style = "color:blue"),
  selectInput("var1", "Variable 1", choices = names(mtcars)),
  selectInput("var2", "Variable 2", choices = names(mtcars)),
  
  mainPanel(
    plotOutput(outputId = "Scatterplot"),
    plotOutput(outputId = "Histogramplotvar1"),
    plotOutput(outputId = "Histogramplotvar2")
  )
)
server <- function(input, output) {
  output$Scatterplot <- renderPlot({
    ggplot(mtcars, aes(x = .data[[input$var1]], y = .data[[input$var2]])) +
      geom_point(color = "blue") +
      geom_smooth(method = lm, color = "red", se = FALSE) +
      ggtitle("Mtcars Scatter Plot")
  })
  
  output$Histogramplotvar1 <- renderPlot({
    ggplot(mtcars, aes(x = .data[[input$var1]])) +
      geom_histogram(fill = "red")
  })
  
  
  output$Histogramplotvar2 <- renderPlot({
    ggplot(mtcars, aes(x = .data[[input$var2]])) +
      geom_histogram(fill = "blue")
  })
  
}

shinyApp(ui = ui, server = server)


VD<- diamonds$carat
VD
library(shiny)

levelsofcolor <- c("D","E","F","G","H","I","J")
ui <- fluidPage(
  titlePanel("The violn plot"),
  selectInput("levels", "levels of color"), choices = levelsofcolor),
  plotOutput("violnplot")
)

server <- function(input, output) {
  output$violnplot <- renderPlot({
    ggplot(diamonds, aes(x = color, y = price)) + 
      geom_violin(fill = "blue") 
  })
  
 
}

shinyApp(ui = ui, server = server)


diamonds

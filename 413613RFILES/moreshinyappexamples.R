


library(shiny)


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





# define the user interface object with the appearance of the app
ui <- fluidPage(
  numericInput(inputId = "n", label = "Sample size", value = 25),
  plotOutput(outputId = "boxplot"),
  textOutput("text")
)

# define the server function with instructions to build the
# objects displayed in the ui
server <- function(input, output) {
  output$boxplot <- renderPlot({
    boxplot(rnorm(input$n))
  })
  
    output$text <- renderText({
      "Hello World!"
  })
}

# call shinyApp() which returns the Shiny app object
shinyApp(ui = ui, server = server)



ui <- fluidPage(
  h2("BoxPlot and Histogram", style = "color:red"),
  h4("by James Dickens", style ="color:blue"),
  numericInput(inputId = "n", label = "Sample size", value = 25),
  plotOutput(outputId = "boxplot"),
  plotOutput(outputId = "histogramplot")
)

server <- function(input, output) {
  output$boxplot <- renderPlot({
    boxplot(rnorm(input$n))
  })
  
  output$histogramplot <- renderPlot({
    hist(rnorm(input$n))
  })
}

shinyApp(ui = ui, server = server)



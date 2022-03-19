


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

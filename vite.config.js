import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: './index.html',
        'idea-chatbot': './idea-chatbot.html',
        'patent-chatbot': './patent-chatbot.html',
        'ai-sketch': './ai-sketch.html',
        '3d-modeling': './3d-modeling.html',
        '3d-view': './3d-view.html',
        'student': './student.html',
        'teacherMonitor': './teacherMonitor.html',
      }
    }
  }
})

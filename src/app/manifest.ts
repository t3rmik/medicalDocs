
/** Installable study workspace; Android uses share_target, desktop may use file_handlers. */
export default function manifest() {
  return {
    id: '/',
    name: 'MedicalDocs Pro — Studio di studio',
    short_name: 'MedicalDocs',
    description: 'Appunti, PDF e strumenti di studio in un workspace pensato per tablet e penna.',
    start_url: '/?source=homescreen',
    scope: '/',
    display: 'standalone',
    background_color: '#f2f8fa',
    theme_color: '#082d3a',
    lang: 'it',
    categories: ['education', 'productivity', 'utilities'],
    launch_handler: { client_mode: 'navigate-existing' },
    icons: [
      { src: '/icons/medicaldocs-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/medicaldocs-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
    ],
    share_target: {
      action: '/share-target', method: 'POST', enctype: 'multipart/form-data',
      params: {
        title: 'title', text: 'text', url: 'url',
        files: [{ name: 'files', accept: [
          'application/pdf', '.pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '.docx',
          'text/plain', '.txt', 'text/html', '.html', '.htm',
        ] }],
      },
    },
    file_handlers: [{
      action: '/?openFile=1',
      accept: {
        'application/pdf': ['.pdf'],
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
        'text/plain': ['.txt'], 'text/html': ['.html', '.htm'],
      },
      icons: [{ src: '/icons/medicaldocs-192.png', sizes: '192x192', type: 'image/png' }],
    }],
  }
}

import { useState } from 'react'
import youmlLogo from '/logo.webp'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={youmlLogo} className="logo" alt="Vite logo" />
        </a>
      </div>
      <h1>YouML Diagram Editor</h1>
      <textarea id='umlPrompt' rows='4' cols='50'>sequence diagram. expressjs, frontend, send natural language diagram descriptions to api which first calls OpenAI API to generate plantUML, then invokes plantUML.com to generate the actual diagram image, and renders the image on the page. !theme amiga</textarea>
      <div className="card">
        <button onClick={generateDiagram} id='generateButton'>
          Generate Diagram
        </button>
      </div>
      <div id='diagramOutput'/>
      <p id='decodedDiagram'/>
    </>
  )
}

let lastGeneratedDiagram = null;

async function uploadImage() {
  const fileInput = document.getElementById('imageUpload');
  const file = fileInput.files[0];

  if (!file) {
    alert("Please select an image to upload.");
    return;
  }

  const formData = new FormData();
  formData.append('image', file);
  formData.append('instructions', 'Describe the pertinent details of this diagram, including all elements, their relationships and the layout.');

  try {
    const response = await fetch('/upload-image', {
      method: 'POST',
      body: formData
    });

    if (response.ok) {
      const { svgData, encodedDiagram } = await response.json();
      const decodedDiagram = plantumlEncoder.decode(encodedDiagram);
      document.getElementById('encodedDiagram').innerText = decodedDiagram;
      document.getElementById('diagramOutput').innerHTML = svgData;
      lastGeneratedDiagram = encodedDiagram; // Store the last generated diagram for future updates
      document.getElementById('copySvgLink').style.display = 'inline';
      document.getElementById('copyLink').style.display = 'inline';
      document.getElementById('umlPrompt').value = ''; // Fixed clearing value

      // Update button text if there's a generated diagram
      updateButtonText();
    } else {
      console.error('Failed to generate diagram');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

import plantumlEncoder from 'plantuml-encoder';

async function generateDiagram() {
  const prompt = document.getElementById('umlPrompt').value;

  const requestBody = {
    prompt,
    isUpdate: !!lastGeneratedDiagram,
    lastPlantUmlCode: lastGeneratedDiagram
  };
  try {
    const response = await fetch('/api/GenerateUml', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (response.ok) {
      const { svgData, encodedDiagram } = await response.json();
      const decodedDiagram = plantumlEncoder.decode(encodedDiagram);
      document.getElementById('decodedDiagram').innerText = decodedDiagram;
      document.getElementById('diagramOutput').innerHTML = svgData;
      lastGeneratedDiagram = encodedDiagram; // Store the last generated diagram for future updates
      document.getElementById('copySvgLink').style.display = 'inline';
      document.getElementById('copyLink').style.display = 'inline';
      document.getElementById('umlPrompt').value = ''; // Fixed clearing value

      // Update button text if there's a generated diagram
      updateButtonText();
    } else {
      console.error('Failed to generate diagram');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

function copySvgToClipboard() {
  const svg = document.getElementById('diagramOutput');

  html2canvas(svg).then(function(canvas) {
    canvas.toBlob(function(blob) {
      navigator.clipboard
        .write([
          new ClipboardItem(
            Object.defineProperty({}, blob.type, {
              value: blob,
              enumerable: true
            })
          )
        ])
        .then(function() {
          console.log("Copied to clipboard");
        })
        .catch((err) => console.error('Clipboard error: ', err));
    });
  }).catch((err) => console.error('HTML2Canvas error: ', err));
}

function copyDecodedDiagram() {
  const decodedText = document.getElementById('encodedDiagram').innerText;
  navigator.clipboard.writeText(decodedText).then(() => {
    alert('Decoded diagram text copied to clipboard!');
  }).catch(err => {
    console.error('Failed to copy text: ', err);
  });
}

function updateButtonText() {
  const button = document.getElementById('generateButton');
  button.innerText = lastGeneratedDiagram ? 'Update Diagram' : 'Generate Diagram';
}

export default App

import { useState } from 'react';
import youmlLogo from '/logo.webp';
import './App.css';
import plantumlEncoder from 'plantuml-encoder';
import html2canvas from 'html2canvas';

function App() {
  const [count, setCount] = useState(0);

  return (
    <>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={youmlLogo} className="logo" alt="Vite logo" />
        </a>
      </div>
      <h1>YouML Diagram Editor</h1>
      <div id="thumbnailContainer" class="thumbnail-container"></div>
      <textarea
        id="umlPrompt"
        rows="4"
        cols="50"
      >
        sequence diagram. expressjs, frontend, send natural language diagram descriptions to api which first calls OpenAI API to generate plantUML, then invokes plantUML.com to generate the actual diagram image, and renders the image on the page. !theme amiga
      </textarea>
      <div id='upload'>
        <input id='imageUpload' type="file" accept="image/*"/>
        <div id="thumbnailContainer" class="thumbnail-container"></div>
      </div>
      <div className="card">
        <button onClick={generateDiagram} id="generateButton">
          Generate Diagram
        </button>
      </div>
      <div id="diagram">
        <a
          id="copySvgLink"
          href="#"
          onClick={copySvgToClipboard}
          style={{ display: 'none' }}
        >
          Copy SVG
        </a>
        <div id="diagramOutput" className="diagram" />
      </div>
      <a
        id="copyLink"
        href="#"
        onClick={copyDecodedDiagram}
        style={{ display: 'none' }}
      >
        Copy raw plantUml
      </a>
      <p id="decodedDiagram" />
    </>
  );
}

let lastGeneratedDiagram = null;

document.getElementById('imageUpload').addEventListener('change', function(event) {
  const file = event.target.files[0];

  if (file) {
    // Create a FileReader to read the image file
    const reader = new FileReader();

    // Set up the callback for when the reader has loaded the image data
    reader.onload = function(e) {
      // Get the container for the thumbnail
      const thumbnailContainer = document.getElementById('thumbnailContainer');

      // Clear any previous thumbnail
      thumbnailContainer.innerHTML = '';

      // Create an image element for the thumbnail
      const img = document.createElement('img');
      img.src = e.target.result; // Set the src to the image data
      img.style.width = '100px'; // Thumbnail size (adjust as needed)
      img.style.height = '100px';
      img.style.objectFit = 'cover'; // Make sure the image fits nicely

      // Append the image thumbnail to the container
      thumbnailContainer.appendChild(img);
    };

    // Read the file as a Data URL (base64 encoded string)
    reader.readAsDataURL(file);
  }
});

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
      document.getElementById('umlPrompt').placeholder =
        'Describe changes to the diagram';

      // Attach mouseover, mouseout, and click event listeners
      addSvgHighlightListeners();

      // Update button text if there's a generated diagram
      updateButtonText();
    } else {
      console.error('Failed to generate diagram');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

function addSvgHighlightListeners() {
  const svgElement = document.getElementById('diagramOutput').querySelector('svg');

  if (svgElement) {
    svgElement.addEventListener('mouseover', function (event) {
      if (event.target && event.target.nodeName === 'text') {
        event.target.style.outline = '2px solid red';
      }
    });

    svgElement.addEventListener('mouseout', function (event) {
      if (event.target && event.target.nodeName === 'text') {
        event.target.style.outline = 'none';
      }
    });

    svgElement.addEventListener('click', function (event) {
      if (event.target && event.target.nodeName === 'text') {
        appendToUmlPrompt(event.target);
      }
    });
  }
}

function appendToUmlPrompt(targetElement) {
  console.log("Appending content of: " + targetElement);
  const umlPrompt = document.getElementById('umlPrompt');

  // Append the text content of the target element to the umlPrompt textarea
  if (umlPrompt.value.trim().length > 0) {
    umlPrompt.value += ` "${targetElement.textContent}"`;
  } else {
    umlPrompt.value += `"${targetElement.textContent}"`;
  }
}

async function copySvgToClipboard() {
  const svg = document.getElementById('diagramOutput');

  html2canvas(svg)
    .then(function (canvas) {
      canvas.toBlob(function (blob) {
        navigator.clipboard
          .write([
            new ClipboardItem(
              Object.defineProperty({}, blob.type, {
                value: blob,
                enumerable: true,
              })
            ),
          ])
          .then(function () {
            console.log('Copied to clipboard');
          })
          .catch((err) => console.error('Clipboard error: ', err));
      });
    })
    .catch((err) => console.error('HTML2Canvas error: ', err));
}

function copyDecodedDiagram() {
  const decodedText = document.getElementById('decodedDiagram').innerText;
  navigator.clipboard
    .writeText(decodedText)
    .then(() => {
      alert('Decoded diagram text copied to clipboard!');
    })
    .catch((err) => {
      console.error('Failed to copy text: ', err);
    });
}

function updateButtonText() {
  const button = document.getElementById('generateButton');
  button.innerText = lastGeneratedDiagram ? 'Update Diagram' : 'Generate Diagram';
}

export default App;

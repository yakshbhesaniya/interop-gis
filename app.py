from flask import Flask, render_template, request, Response
import requests

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/proxy', methods=['GET', 'POST'])
def proxy():
    url = request.args.get('url')
    if not url:
        return "Missing 'url' parameter", 400

    # Extract all other query parameters to forward
    params = request.args.to_dict(flat=False)
    params.pop('url', None)
    
    # Flatten single-item lists
    for k, v in params.items():
        if isinstance(v, list) and len(v) == 1:
            params[k] = v[0]

    try:
        # Proxy the request to the target server
        if request.method == 'GET':
            resp = requests.get(url, params=params)
        elif request.method == 'POST':
            headers = {}
            if request.headers.get('Content-Type'):
                headers['Content-Type'] = request.headers.get('Content-Type')
            resp = requests.post(url, data=request.data, headers=headers)
            
        excluded_headers = ['content-encoding', 'content-length', 'transfer-encoding', 'connection']
        headers = [(name, value) for (name, value) in resp.raw.headers.items()
                   if name.lower() not in excluded_headers]
        
        response = Response(resp.content, resp.status_code, headers)
        response.headers['Access-Control-Allow-Origin'] = '*'
        return response
        
    except requests.exceptions.RequestException as e:
        return f"Proxy Error: {str(e)}", 502
    except Exception as e:
        return str(e), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)

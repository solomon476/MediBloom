export default function handler(request, response) {
    // Enable CORS for development
    response.setHeader('Access-Control-Allow-Credentials', true);
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    response.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );
    
    if (request.method === 'OPTIONS') {
        response.status(200).end();
        return;
    }
    
    response.status(200).json({
        status: 'ok',
        message: 'Medi Bloom API is running smoothly.',
        timestamp: new Date().toISOString()
    });
}

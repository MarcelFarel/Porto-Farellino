
const validator = {
    rules: {
        username: v => !v.trim() ? 'Username required' : 
                     v.length < 3 ? 'Min 3 characters' : 
                     v.length > 20 ? 'Max 20 characters' : null,
        
        email: v => !v.trim() ? 'Email required' : 
                   !v.includes('@') || !v.split('@')[1]?.includes('.') ? 'Invalid email' : null,
        
        phone: v => {
            const digits = v.replace(/\D/g, '');
            return !digits ? 'Phone required' : 
                   digits.length < 8 ? 'Min 8 digits' : 
                   digits.length > 15 ? 'Max 15 digits' : null;
        },
        
        country: v => !v ? 'Select country' : null,
        
        password: v => !v ? 'Password required' : 
                      v.length < 8 ? 'Min 8 characters' : 
                      !/[A-Z]/.test(v) ? 'Need uppercase' : 
                      !/[a-z]/.test(v) ? 'Need lowercase' : 
                      !/\d/.test(v) ? 'Need number' : null,
        
        terms: v => !v ? 'Accept terms' : null
    },

    showError(field, msg) {
        const group = document.getElementById(field).closest('.form-group, .checkbox-group')?.parentElement ||
                     document.getElementById(field).closest('.form-group');
        const error = document.getElementById(field + 'Error');
        
        group?.classList.add('error');
        if (error) {
            error.textContent = msg;
            error.classList.add('show');
        }
    },

    clearError(field) {
        const group = document.getElementById(field).closest('.form-group, .checkbox-group')?.parentElement || 
                     document.getElementById(field).closest('.form-group');
        const error = document.getElementById(field + 'Error');
        
        group?.classList.remove('error');
        if (error) {
            error.textContent = '';
            error.classList.remove('show');
        }
    },

    check(field) {
        const el = document.getElementById(field);
        const value = field === 'terms' ? el.checked : el.value;
        const error = this.rules[field](value);
        
        if (error) {
            this.showError(field, error);
            return false;
        } else {
            this.clearError(field);
            return true;
        }
    },

    checkAll() {
        return Object.keys(this.rules).every(field => this.check(field));
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('registerForm');
    const success = document.getElementById('successMessage');

    ['username', 'email', 'phone', 'password'].forEach(field => {
        document.getElementById(field).addEventListener('blur', () => validator.check(field));
        document.getElementById(field).addEventListener('input', () => validator.clearError(field));
    });

    document.getElementById('country').addEventListener('change', () => validator.check('country'));
    document.getElementById('terms').addEventListener('change', () => validator.check('terms'));

    document.getElementById('phone').addEventListener('input', function() {
        this.value = this.value.replace(/[^\d\+\-\s\(\)]/g, '');
    });

    form.addEventListener('submit', e => {
        e.preventDefault();
        success.classList.remove('show');
        
        if (validator.checkAll()) {
            setTimeout(() => {
                success.classList.add('show');
                form.reset();
                success.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 500);
        } else {
            document.querySelector('.error')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    });
});
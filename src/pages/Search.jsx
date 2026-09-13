import React, { useState, useEffect } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import SearchBar from '../components/SearchBar';
import ItemCard from '../components/ItemCard';
import Pagination from '../components/Pagination';
import Loader from '../components/Loader';
import Modal from '../components/Modal';
import { supabase } from '../services/supabase';
import { getSignedImageUrl } from '../services/storage';

const Search = () => {
  const [loading, setLoading] = useState(true);
  const [allItems, setAllItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedItemImg, setSelectedItemImg] = useState('');
  const [loadingModalImg, setLoadingModalImg] = useState(false);

  const categories = [
    'Electronics',
    'Books & Stationery',
    'Clothing & Accessories',
    'ID Cards & Wallets',
    'Keys',
    'Bags & Backpacks',
    'Others'
  ];

  /*
   * SECURITY:
   * These field lists contain only information that is safe
   * to display in the public Search Registry.
   *
   * Contact fields such as phone, email and contact are
   * intentionally NOT requested from Supabase.
   */

  const lostItemFields = `
    id,
    created_at,
    item_name,
    category,
    brand,
    color,
    description,
    location,
    image_url,
    status,
    date_lost,
    time_lost
  `;

  const foundItemFields = `
    id,
    created_at,
    item_name,
    category,
    brand,
    color,
    description,
    location,
    image_url,
    status,
    date_found,
    time_found
  `;

  /*
   * Extra defensive sanitization.
   * Even if contact-related fields somehow appear in a response,
   * remove them before the item reaches the UI.
   */

  const sanitizeItem = (item, type) => {
    if (!item) return null;

    const {
      contact,
      phone,
      email,
      reporter_email,
      reporter_phone,
      contact_email,
      contact_phone,
      user_email,
      user_phone,
      ...safeItem
    } = item;

    return {
      ...safeItem,
      type
    };
  };

  const fetchRegistryItems = async () => {
    setLoading(true);

    try {
      const {
        data: lostData,
        error: lostErr
      } = await supabase
        .from('lost_items')
        .select(lostItemFields)
        .order('created_at', { ascending: false });

      if (lostErr) throw lostErr;

      const {
        data: foundData,
        error: foundErr
      } = await supabase
        .from('found_items')
        .select(foundItemFields)
        .order('created_at', { ascending: false });

      if (foundErr) throw foundErr;

      const normalizedLost = (lostData || [])
        .map(item => sanitizeItem(item, 'lost'))
        .filter(Boolean);

      const normalizedFound = (foundData || [])
        .map(item => sanitizeItem(item, 'found'))
        .filter(Boolean);

      const merged = [...normalizedLost, ...normalizedFound].sort(
        (a, b) =>
          new Date(b.created_at) - new Date(a.created_at)
      );

      setAllItems(merged);
      setFilteredItems(merged);
      setCurrentPage(1);
    } catch (err) {
      console.error('Failed to load search registry:', err);
      console.error(
        'Search registry error message:',
        err?.message
      );
      console.error(
        'Search registry error details:',
        err?.details
      );
      console.error(
        'Search registry error hint:',
        err?.hint
      );
      console.error(
        'Search registry error code:',
        err?.code
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRegistryItems();
  }, []);

  const handleSearch = (filters) => {
    let result = [...allItems];

    if (filters.query) {
      const q = filters.query.toLowerCase();

      result = result.filter(
        item =>
          (item.item_name || '').toLowerCase().includes(q) ||
          (item.description || '').toLowerCase().includes(q)
      );
    }

    if (filters.category) {
      result = result.filter(
        item => item.category === filters.category
      );
    }

    if (filters.brand) {
      const b = filters.brand.toLowerCase();

      result = result.filter(
        item =>
          item.brand &&
          item.brand.toLowerCase().includes(b)
      );
    }

    if (filters.color) {
      const c = filters.color.toLowerCase();

      result = result.filter(
        item =>
          item.color &&
          item.color.toLowerCase().includes(c)
      );
    }

    if (filters.date) {
      result = result.filter(item => {
        const itemDate =
          item.type === 'lost'
            ? item.date_lost
            : item.date_found;

        return itemDate === filters.date;
      });
    }

    if (filters.location) {
      const loc = filters.location.toLowerCase();

      result = result.filter(
        item =>
          item.location &&
          item.location.toLowerCase().includes(loc)
      );
    }

    if (filters.status) {
      result = result.filter(
        item => item.status === filters.status
      );
    }

    setFilteredItems(result);
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(
    filteredItems.length / itemsPerPage
  );

  const indexOfLastItem =
    currentPage * itemsPerPage;

  const indexOfFirstItem =
    indexOfLastItem - itemsPerPage;

  const currentItems = filteredItems.slice(
    indexOfFirstItem,
    indexOfLastItem
  );

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const handleOpenDetails = async (item) => {
    /*
     * Final protection:
     * Strip contact information again before putting
     * the selected item into modal state.
     */

    const safeItem = sanitizeItem(item, item.type);

    setSelectedItem(safeItem);
    setSelectedItemImg('');

    if (safeItem.image_url) {
      setLoadingModalImg(true);

      try {
        const url = await getSignedImageUrl(
          safeItem.image_url
        );

        setSelectedItemImg(url);
      } catch (e) {
        console.error('Failed to load item image:', e);
      } finally {
        setLoadingModalImg(false);
      }
    }
  };

  return (
    <DashboardLayout>
      <div className="mb-4">
        <h2 className="fw-bold text-body-emphasis">
          Registry Search
        </h2>

        <p className="text-secondary">
          Search and filter reported items across campus.
        </p>
      </div>

      <SearchBar
        onSearch={handleSearch}
        categories={categories}
      />

      {loading ? (
        <Loader message="Loading campus registry database..." />
      ) : filteredItems.length > 0 ? (
        <>
          <div className="row g-4">
            {currentItems.map(item => (
              <div
                key={`${item.type}-${item.id}`}
                className="col-12 col-md-6 col-lg-4"
              >
                <ItemCard
                  item={item}
                  type={item.type}
                  actionLabel="Inspect Details"
                  onAction={handleOpenDetails}
                />
              </div>
            ))}
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </>
      ) : (
        <div className="card text-center border-0 shadow-sm p-5 bg-body rounded-4">
          <i className="bi bi-search-heart display-2 text-secondary mb-3"></i>

          <h4 className="fw-bold text-body-emphasis">
            No Reports Found
          </h4>

          <p className="text-muted small">
            No items match the active filter criteria.
            Try adjusting keywords.
          </p>
        </div>
      )}

      {/* Item Details Modal */}
      {selectedItem && (
        <Modal
          show={!!selectedItem}
          title={`Item Details: ${selectedItem.item_name}`}
          onClose={() => setSelectedItem(null)}
          size="lg"
        >
          <div className="row g-4">
            <div className="col-12 col-md-5">
              <div
                className="bg-light rounded-4 border overflow-hidden d-flex align-items-center justify-content-center"
                style={{
                  minHeight: '260px'
                }}
              >
                {loadingModalImg ? (
                  <div
                    className="spinner-border text-primary"
                    role="status"
                  ></div>
                ) : selectedItemImg ? (
                  <img
                    src={selectedItemImg}
                    alt={selectedItem.item_name}
                    className="w-100 img-fluid"
                    style={{
                      objectFit: 'contain',
                      maxHeight: '350px'
                    }}
                  />
                ) : (
                  <div className="text-muted text-center p-4">
                    <i className="bi bi-image fs-1 mb-2 d-block text-secondary"></i>

                    <p className="small mb-0">
                      No image uploaded
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="col-12 col-md-7">
              <span
                className={`badge ${selectedItem.type === 'lost'
                    ? 'bg-warning text-dark'
                    : 'bg-success'
                  } px-3 py-1.5 rounded-pill text-capitalize mb-2`}
              >
                {selectedItem.type}
              </span>

              <h4 className="fw-bold text-body-emphasis mb-3">
                {selectedItem.item_name}
              </h4>

              <div className="table-responsive small">
                <table className="table table-borderless">
                  <tbody>
                    <tr>
                      <td
                        className="fw-bold text-muted ps-0"
                        style={{ width: '120px' }}
                      >
                        Category:
                      </td>

                      <td className="text-body-emphasis text-capitalize">
                        {selectedItem.category}
                      </td>
                    </tr>

                    {selectedItem.brand && (
                      <tr>
                        <td className="fw-bold text-muted ps-0">
                          Brand:
                        </td>

                        <td className="text-body-emphasis text-capitalize">
                          {selectedItem.brand}
                        </td>
                      </tr>
                    )}

                    {selectedItem.color && (
                      <tr>
                        <td className="fw-bold text-muted ps-0">
                          Color:
                        </td>

                        <td className="text-body-emphasis text-capitalize">
                          {selectedItem.color}
                        </td>
                      </tr>
                    )}

                    <tr>
                      <td className="fw-bold text-muted ps-0">
                        Location:
                      </td>

                      <td className="text-body-emphasis">
                        {selectedItem.location}
                      </td>
                    </tr>

                    <tr>
                      <td className="fw-bold text-muted ps-0">
                        Date:
                      </td>

                      <td className="text-body-emphasis">
                        {selectedItem.type === 'lost'
                          ? selectedItem.date_lost
                          : selectedItem.date_found}
                      </td>
                    </tr>

                    <tr>
                      <td className="fw-bold text-muted ps-0">
                        Status:
                      </td>

                      <td className="text-body-emphasis text-capitalize">
                        <span className="badge bg-secondary-subtle text-secondary-emphasis">
                          {selectedItem.status}
                        </span>
                      </td>
                    </tr>

                    <tr>
                      <td className="fw-bold text-muted ps-0">
                        Reporter Contact:
                      </td>

                      <td className="text-muted">
                        Contact details are hidden until a claim is
                        approved by an administrator.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <h6 className="fw-bold text-body-emphasis mt-3 mb-2">
                Description
              </h6>

              <p className="text-secondary small leading-relaxed">
                {selectedItem.description}
              </p>
            </div>
          </div>
        </Modal>
      )}
    </DashboardLayout>
  );
};

export default Search;